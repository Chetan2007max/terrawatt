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
        "Maharashtra: EnergyMet", "Goa: EnergyMet", "DD: EnergyMet",
        "DNH: EnergyMet", "Essar steel: EnergyMet",
        "AMNSIL: EnergyMet", "DNHDDPDCL: EnergyMet",
        "BALCO: EnergyMet", "RIL JAMNAGAR: EnergyMet",
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


def build_summing_matrix():
    """TODO (Day 15): build the full S matrix from REGION_MEMBERS + Other node."""
    raise NotImplementedError("Implement on Day 15 per README Section 5.3")

# WR outlier finding (2015-01-19): state-level breakdown appears
# systematically scaled down (states sum to ~307 vs region total 909;
# e.g. Maharashtra=104 vs its typical 300-400+ range) -- distinct from
# both the NR (missing breakdown) and NER (single corrupted value)
# patterns. Root cause not fully determined; treat this date's state-
# level values as unreliable for state-level training, use region
# total as-is for region/national training.
