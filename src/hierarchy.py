"""
hierarchy.py
Defines TerraWatt's real 3-level hierarchy:
    State / bulk-consumer (+ synthetic "Other" node) -> Region (NR/WR/SR/ER/NER) -> National

See README Section 5.1 and 5.3 for the verified member lists and coherence
validation results.

INVESTIGATION FINDING (Northern Region):
    112 missing state-level days (~2.2%) found. Breakdown:
      - 87-day contiguous gap: 2013-01-03 to 2013-03-30 (pre-dates
        GRID-INDIA's documented reliable start date of 2013-03-31 --
        state-level reporting wasn't yet standardized).
      - 25 isolated single/double-day gaps scattered through 2020,
        including 2020-09-30 where the regional aggregate (1268) was
        reported without any state-level breakdown that day.
    Decision: state-level models train from 2013-03-31 onward.
    Isolated later gaps are handled via interpolation, not exclusion.

TODO (Day 4): confirm and complete WR, SR, ER, NER member lists against
official GRID-INDIA RLDC documentation (cross-check ambiguous columns
like DVC and Sikkim placement).
"""

STATE_LEVEL_RELIABLE_FROM = "2013-03-31"  # confirmed via missing-data investigation

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
        # TODO: confirm DNHDDPDCL, BALCO, RIL JAMNAGAR placement
    ],
    "SR": [
        "Andhra Pradesh: EnergyMet", "Karnataka: EnergyMet", "Kerala: EnergyMet",
        "Tamil Nadu: EnergyMet", "Puducherry: EnergyMet", "Telangana: EnergyMet",
    ],
    "ER": [
        "Bihar: EnergyMet", "DVC: EnergyMet", "Jharkhand: EnergyMet",
        "Odisha: EnergyMet", "West Bengal: EnergyMet", "Sikkim: EnergyMet",
        "Railways_ER ISTS: EnergyMet",
        # TODO: confirm Sikkim official region -- some sources place it under NER
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
