"""
hierarchy.py
Defines TerraWatt's real 3-level hierarchy:
    State / bulk-consumer (+ synthetic "Other" node) -> Region (NR/WR/SR/ER/NER) -> National

See README Section 5.1 and 5.3 for the verified member lists and coherence
validation results.

INVESTIGATION FINDINGS (all 5 regions checked against real data):

  NR, SR, ER: coherence confirmed clean (median diff = 0, only minor
    residual noise). See NR investigation below for the one notable case.

  NR: 112 missing state-level days (~2.2%) found. Breakdown:
      - 87-day contiguous gap: 2013-01-03 to 2013-03-30 (pre-dates
        GRID-INDIA's documented reliable start date of 2013-03-31 --
        state-level reporting wasn't yet standardized).
      - 25 isolated single/double-day gaps scattered through 2020,
        including 2020-09-30 where the regional aggregate (1268) was
        reported without any state-level breakdown that day.
    Decision: state-level models train from 2013-03-31 onward.
    Isolated later gaps handled via interpolation, not exclusion.

  WR: initial member list was incomplete (only 2,577 of ~4,890 valid
    days, large mean/max diff). Root cause: 4 bulk-consumer entities
    were missing from the member list. Added based on physical plant
    location:
      - RIL JAMNAGAR (Reliance refinery, Jamnagar, Gujarat) -> WR
      - AMNSIL (ArcelorMittal Nippon Steel, Hazira, Gujarat) -> WR
      - BALCO (Bharat Aluminium Co., Korba, Chhattisgarh) -> WR
      - DNHDDPDCL (utility for DD/DNH, already WR-adjacent) -> WR
    After the fix: valid days rose to 2,563, mean diff dropped from
    3.71 to 0.24, matching the pattern of the other clean regions.
    One remaining large single-day outlier (max=602.1) not yet root-
    caused -- treat similarly to the NR/NER investigations before
    trusting WR at the same confidence level as NR/SR/ER.

  NER: one confirmed corrupted data point, INITIALLY MISDIAGNOSED.
    On 2014-11-25, NER total EnergyMet = 37 while the 7 state members
    summed to ~2078, and the first pass concluded the region TOTAL was
    corrupted. Verifying the interpolated fix against neighboring days
    revealed the opposite: NER=37 is consistent with surrounding days
    (35-37 range), while Assam=1190 that day is wildly inconsistent
    with its own neighbors (~18-21 range). The actual corrupted value
    is Assam: EnergyMet, not the region total. Corrected: Assam is
    treated as NaN and interpolated (result: 20.95); NER total is left
    untouched. Lesson: always validate a fix against neighboring-day
    context for the SPECIFIC column being changed, not just whether
    parent/child sums reconcile.

TODO (Day 5+): root-cause the remaining WR max=602.1 outlier day the
same way NER's 2014-11-25 case was diagnosed, before finalizing WR at
full confidence.
"""

STATE_LEVEL_RELIABLE_FROM = "2013-03-31"  # confirmed via missing-data investigation

# Dates with confirmed bad/corrupted values requiring interpolation
# rather than exclusion (see investigation notes above).
KNOWN_BAD_VALUES = {
    ("NER: EnergyMet", "2014-11-25"): "corrupted region total; interpolate",
    ("NR: EnergyMet_state_breakdown", "2020-09-30"): "region total reported without state breakdown",
}

REGION_MEMBERS = {
    "NR": [
        "Punjab: EnergyMet", "Haryana: EnergyMet", "Rajasthan: EnergyMet",
        "Delhi: EnergyMet", "UP: EnergyMet", "Uttarakhand: EnergyMet",
        "HP: EnergyMet", "J&K(UT) & Ladakh(UT): EnergyMet", "Chandigarh: EnergyMet",
        "Railways_NR ISTS: EnergyMet", "Bulk Consumer_NR ISTS: EnergyMet",
    ],
    "WR": [
        "Chhattisgarh: EnergyMet", "Gujarat: EnergyMet", "MP: EnergyMet",
        "Maharashtra: EnergyMet", "Goa: EnergyMet",
        "AMNSIL: EnergyMet", "DNHDDPDCL: EnergyMet",
        "BALCO: EnergyMet", "RIL JAMNAGAR: EnergyMet",
        # NOTE: DD, DNH, Essar steel deliberately EXCLUDED as standalone
        # leaves. They have a multi-year reporting gap extending to
        # 2026-05-15 (confirmed via last-NaN-date check), which would
        # force the whole-hierarchy reconciliation test window down to
        # ~4 months if kept separate. All three are small-magnitude
        # (mean EnergyMet 0.26-0.81), so their contribution is instead
        # absorbed into the Other_WR residual node by construction
        # (Other_WR = WR total - sum(these 9 tracked members)), keeping
        # the full 2025-01-01+ test window usable for reconciliation.
    ],
    "SR": [
        "Andhra Pradesh: EnergyMet", "Karnataka: EnergyMet", "Kerala: EnergyMet",
        "Tamil Nadu: EnergyMet", "Puducherry: EnergyMet", "Telangana: EnergyMet",
    ],
    "ER": [
        "Bihar: EnergyMet", "DVC: EnergyMet", "Jharkhand: EnergyMet",
        "Odisha: EnergyMet", "West Bengal: EnergyMet", "Sikkim: EnergyMet",
        "Railways_ER ISTS: EnergyMet",
        # NOTE: Sikkim placement under ER (not NER) currently unverified
        # against official RLDC documentation -- coherence checks pass
        # either way since ER and NER both independently validated clean
        # aside from the NER 2014-11-25 corrupted value, but confirm
        # before final writeup.
    ],
    "NER": [
        "Arunachal Pradesh: EnergyMet", "Assam: EnergyMet", "Manipur: EnergyMet",
        "Meghalaya: EnergyMet", "Mizoram: EnergyMet", "Nagaland: EnergyMet",
        "Tripura: EnergyMet",
    ],
}

REGIONS = ["NR", "WR", "SR", "ER", "NER"]


def build_summing_matrix(df_clean):
    """
    Build the full 3-level (State/bulk-consumer + Other -> Region -> National)
    summing matrix using hierarchicalforecast's aggregate(). Adds a synthetic
    "Other_<Region>" node per region (region_total - sum(known members)) so
    the library's computed region/national totals exactly match the real
    data columns, per README Section 5.3.

    Returns (Y_df, S_df, tags) as produced by hierarchicalforecast.aggregate():
      Y_df: long-format hierarchically structured series
      S_df: the summing matrix itself
      tags: dict mapping each level name to its list of unique_ids
    """
    import pandas as pd
    from hierarchicalforecast.utils import aggregate

    long_rows = []
    for region in REGIONS:
        member_cols = REGION_MEMBERS[region]
        region_col = f"{region}: EnergyMet"

        for col in member_cols:
            node_name = col.replace(": EnergyMet", "")
            temp = df_clean[["date", col]].copy()
            temp.columns = ["ds", "y"]
            temp["Country"] = "India"
            temp["Region"] = region
            temp["State"] = node_name
            long_rows.append(temp)

        other = df_clean[region_col] - df_clean[member_cols].sum(axis=1)
        temp_other = pd.DataFrame({
            "ds": df_clean["date"],
            "y": other,
            "Country": "India",
            "Region": region,
            "State": f"Other_{region}"
        })
        long_rows.append(temp_other)

    long_df = pd.concat(long_rows, ignore_index=True)
    long_df = long_df.dropna(subset=["y"])

    spec = [["Country"], ["Country", "Region"], ["Country", "Region", "State"]]
    Y_df, S_df, tags = aggregate(df=long_df, spec=spec)
    return Y_df, S_df, tags

# WR outlier finding (2015-01-19): state-level breakdown appears
# systematically scaled down (states sum to ~307 vs region total 909;
# e.g. Maharashtra=104 vs its typical 300-400+ range) -- distinct from
# both the NR (missing breakdown) and NER (single corrupted value)
# patterns. Root cause not fully determined; treat this date's state-
# level values as unreliable for state-level training, use region
# total as-is for region/national training.
