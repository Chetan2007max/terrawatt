"""
test_split.py
Automated tests for reproducible chronological data split.
Fulfills Phase A acceptance criteria:
- Proves split.json exists and is valid.
- Proves no date overlap between train, validation, and test sets.
- Proves no test date appears in any training or validation set.
- Proves strict chronological ordering.
"""

import json
import os
import sys
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from src.split import DEFAULT_ARTIFACT_PATH, DEFAULT_DATA_PATH, get_split_data, load_split_metadata


def test_split_json_exists():
    """Verify that artifacts/split.json exists and is readable."""
    assert os.path.exists(DEFAULT_ARTIFACT_PATH), f"Missing {DEFAULT_ARTIFACT_PATH}"
    meta = load_split_metadata(DEFAULT_ARTIFACT_PATH)
    assert "train" in meta
    assert "val" in meta
    assert "train_full" in meta
    assert "test" in meta
    assert "cutoffs" in meta


def test_no_date_overlap_between_splits():
    """Verify strictly zero date overlap across train, validation, and test partitions."""
    train_df, val_df, train_full_df, test_df = get_split_data()

    train_dates = set(train_df["date"].dt.strftime("%Y-%m-%d"))
    val_dates = set(val_df["date"].dt.strftime("%Y-%m-%d"))
    test_dates = set(test_df["date"].dt.strftime("%Y-%m-%d"))

    # Train vs Val
    overlap_train_val = train_dates.intersection(val_dates)
    assert len(overlap_train_val) == 0, f"Train and Validation dates overlap: {overlap_train_val}"

    # Train vs Test
    overlap_train_test = train_dates.intersection(test_dates)
    assert len(overlap_train_test) == 0, f"Train and Test dates overlap: {overlap_train_test}"

    # Val vs Test
    overlap_val_test = val_dates.intersection(test_dates)
    assert len(overlap_val_test) == 0, f"Validation and Test dates overlap: {overlap_val_test}"


def test_strict_chronological_order():
    """Verify that train strictly precedes validation, which strictly precedes test."""
    train_df, val_df, train_full_df, test_df = get_split_data()

    max_train = train_df["date"].max()
    min_val = val_df["date"].min()
    max_val = val_df["date"].max()
    min_test = test_df["date"].min()

    assert max_train < min_val, f"Train max ({max_train}) must precede Val min ({min_val})"
    assert max_val < min_test, f"Val max ({max_val}) must precede Test min ({min_test})"


def test_no_test_date_in_training_or_validation():
    """
    Mandated rule: 'Never use the test period for training, feature selection,
    tuning or model choice. Add an automated test that fails if any test date
    appears in a training or validation set.'
    """
    train_df, val_df, train_full_df, test_df = get_split_data()

    test_date_set = set(test_df["date"].dt.strftime("%Y-%m-%d"))
    train_full_date_set = set(train_full_df["date"].dt.strftime("%Y-%m-%d"))

    leakage = train_full_date_set.intersection(test_date_set)
    assert len(leakage) == 0, (
        f"CRITICAL DATA LEAKAGE: Found {len(leakage)} test dates in training set: {list(leakage)[:5]}"
    )


def test_only_reliable_rows_used():
    """Verify that unreliable rows (pre-2013-03-31) are completely excluded from all split sets."""
    train_df, val_df, train_full_df, test_df = get_split_data()

    for name, df in [("train", train_df), ("val", val_df), ("train_full", train_full_df), ("test", test_df)]:
        assert (df["is_data_reliable"] == True).all(), f"Found unreliable rows in {name} partition"
        assert df["date"].min() >= pd.Timestamp("2013-03-31"), f"Found pre-2013-03-31 rows in {name}"


def test_row_counts_sum_to_total_reliable():
    """Verify that train + val == train_full and train_full + test == total reliable rows."""
    meta = load_split_metadata(DEFAULT_ARTIFACT_PATH)
    train_df, val_df, train_full_df, test_df = get_split_data()

    assert len(train_df) + len(val_df) == len(train_full_df)
    assert len(train_full_df) + len(test_df) == meta["total_reliable_rows"]
    assert len(test_df) == meta["test"]["n_rows"]

