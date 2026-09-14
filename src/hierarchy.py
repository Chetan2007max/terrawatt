"""
hierarchy.py
Defines TerraWatt's real 3-level hierarchy:
    State / bulk-consumer (+ synthetic "Other" node) -> Region (NR/WR/SR/ER/NER) -> National

See README Section 5.1 and 5.3 for the verified member lists and coherence
validation results (median diff = 0, 99.6%+ days near-exact; 2020-09-30 is a
known outlier requiring investigation before this file is finalized).

TODO (Day 4): fill in REGION_MEMBERS with the confirmed, official mapping
(cross-check bulk-consumer suffixes and ambiguous columns like DVC/Sikkim
against GRID-INDIA's official RLDC documentation before trusting this dict).
"""

# Placeholder structure — confirm and complete on Day 4.
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
        # TODO: confirm Sikkim official region — some sources place it under NER
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
