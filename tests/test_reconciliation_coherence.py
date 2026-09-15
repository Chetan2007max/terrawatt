"""
Automated tests confirming reconciled forecasts satisfy hierarchy
coherence: sum(children) == parent, within a tight tolerance.

Run with: pytest tests/test_reconciliation_coherence.py -v
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import pytest

from src.data_loader import load_raw_data, clean_data
from src.hierarchy import REGION_MEMBERS, REGIONS, build_summing_matrix


COHERENCE_TOLERANCE = 1e-6  # reconciled forecasts should be coherent to near machine precision


@pytest.fixture(scope="module")
def reconciled_data():
    """Load the saved reconciled forecast output for testing."""
    path = "data/processed/reconciled_forecasts_mint_shrink.csv"
    if not os.path.exists(path):
        pytest.skip(f"{path} not found -- run the reconciliation pipeline first")
    df = pd.read_csv(path)
    rec_col = [c for c in df.columns if "MinTrace" in c][0]
    return df, rec_col


def test_state_to_region_coherence(reconciled_data):
    """For each region, sum of its bottom-level nodes must equal the region total."""
    df, rec_col = reconciled_data
    for region in REGIONS:
        bottom = df[df["unique_id"].str.startswith(f"India/{region}/")]
        total = df[df["unique_id"] == f"India/{region}"]
        bottom_sum = bottom.groupby("ds")[rec_col].sum()
        total_series = total.set_index("ds")[rec_col]
        diff = (total_series - bottom_sum).abs()
        max_diff = diff.max()
        assert max_diff < COHERENCE_TOLERANCE, (
            f"{region}: max coherence error {max_diff} exceeds tolerance {COHERENCE_TOLERANCE}"
        )


def test_region_to_national_coherence(reconciled_data):
    """Sum of all 5 region totals must equal the national total."""
    df, rec_col = reconciled_data
    regions = df[df["unique_id"].isin([f"India/{r}" for r in REGIONS])]
    national = df[df["unique_id"] == "India"]
    region_sum = regions.groupby("ds")[rec_col].sum()
    national_series = national.set_index("ds")[rec_col]
    diff = (national_series - region_sum).abs()
    max_diff = diff.max()
    assert max_diff < COHERENCE_TOLERANCE, (
        f"National: max coherence error {max_diff} exceeds tolerance {COHERENCE_TOLERANCE}"
    )


def test_no_negative_energy_forecasts(reconciled_data):
    """Reconciled EnergyMet forecasts should not be meaningfully negative (small residual-node noise aside)."""
    df, rec_col = reconciled_data
    # Allow tiny negative noise only for synthetic Other_* residual nodes
    non_other = df[~df["unique_id"].str.contains("Other_")]
    meaningfully_negative = non_other[non_other[rec_col] < -1.0]
    assert len(meaningfully_negative) == 0, (
        f"Found {len(meaningfully_negative)} forecasts with meaningfully negative energy values"
    )
