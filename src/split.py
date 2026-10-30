"""
split.py
Reproducible chronological data split for TerraWatt v2.
See README Section 4 (Phase A) and DECISIONS.md.

Rules enforced:
- Only rows where is_data_reliable is True (2013-03-31 onwards) are used.
- Chronological split: first 80% train_full, last 20% test holdout.
- Inside the 80%, the last 10% is a validation block used for tuning and model selection.
- All split metadata is persisted to artifacts/split.json.
- Zero data leakage: strict chronological order, no date overlap.
"""

import json
import os
from pathlib import Path
from typing import Dict, Tuple
import pandas as pd

DEFAULT_DATA_PATH = "data/processed/cleaned_daily.csv"
DEFAULT_ARTIFACT_PATH = "artifacts/split.json"


def compute_chronological_split(
    df: pd.DataFrame,
    train_frac: float = 0.80,
    val_frac_of_train: float = 0.10,
    date_col: str = "date",
    reliable_col: str = "is_data_reliable",
) -> Dict:
    """
    Compute reproducible chronological split indices and date boundaries.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned daily dataset with date and reliable flag columns.
    train_frac : float
        Fraction of reliable rows allocated to training + validation (default 0.80).
    val_frac_of_train : float
        Fraction of the 80% training block allocated to the validation block (default 0.10).
    date_col : str
        Name of the date column.
    reliable_col : str
        Name of the boolean flag indicating reliable rows.

    Returns
    -------
    dict
        Dictionary containing metadata, date ranges, and row counts for train, val, and test.
    """
    if reliable_col in df.columns:
        rel = df[df[reliable_col] == True].copy()
    else:
        rel = df.copy()

    rel[date_col] = pd.to_datetime(rel[date_col])
    rel = rel.sort_values(date_col).reset_index(drop=True)

    n_total = len(rel)
    if n_total == 0:
        raise ValueError("No reliable rows available to split.")

    # 80% train_full, 20% test
    n_train_full = int(round(n_total * train_frac))
    n_test = n_total - n_train_full

    # Inside the 80%, last 10% is validation block
    n_val = int(round(n_train_full * val_frac_of_train))
    n_train = n_train_full - n_val

    train_series = rel.iloc[:n_train]
    val_series = rel.iloc[n_train:n_train_full]
    train_full_series = rel.iloc[:n_train_full]
    test_series = rel.iloc[n_train_full:]

    split_meta = {
        "dataset_name": "GRID-INDIA (POSOCO) Daily Energy Data",
        "reliable_period_start": train_series[date_col].min().strftime("%Y-%m-%d"),
        "reliable_period_end": test_series[date_col].max().strftime("%Y-%m-%d"),
        "total_reliable_rows": n_total,
        "split_ratios": {
            "train_fraction_of_total": round(n_train / n_total, 4),
            "val_fraction_of_total": round(n_val / n_total, 4),
            "train_full_fraction_of_total": round(n_train_full / n_total, 4),
            "test_fraction_of_total": round(n_test / n_total, 4),
            "val_fraction_of_train_full": val_frac_of_train,
        },
        "train": {
            "start_date": train_series[date_col].min().strftime("%Y-%m-%d"),
            "end_date": train_series[date_col].max().strftime("%Y-%m-%d"),
            "n_rows": n_train,
        },
        "val": {
            "start_date": val_series[date_col].min().strftime("%Y-%m-%d"),
            "end_date": val_series[date_col].max().strftime("%Y-%m-%d"),
            "n_rows": n_val,
        },
        "train_full": {
            "start_date": train_full_series[date_col].min().strftime("%Y-%m-%d"),
            "end_date": train_full_series[date_col].max().strftime("%Y-%m-%d"),
            "n_rows": n_train_full,
        },
        "test": {
            "start_date": test_series[date_col].min().strftime("%Y-%m-%d"),
            "end_date": test_series[date_col].max().strftime("%Y-%m-%d"),
            "n_rows": n_test,
        },
        "cutoffs": {
            "val_start_date": val_series[date_col].min().strftime("%Y-%m-%d"),
            "test_start_date": test_series[date_col].min().strftime("%Y-%m-%d"),
        },
    }

    return split_meta


def save_split_metadata(split_meta: Dict, output_path: str = DEFAULT_ARTIFACT_PATH) -> None:
    """Save split metadata to a JSON file."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(split_meta, f, indent=2)
    print(f"Saved split metadata to {output_path}")


def load_split_metadata(artifact_path: str = DEFAULT_ARTIFACT_PATH) -> Dict:
    """Load split metadata from artifacts/split.json."""
    if not os.path.exists(artifact_path):
        raise FileNotFoundError(
            f"{artifact_path} not found. Run src/split.py first to generate the split."
        )
    with open(artifact_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_split_data(
    df: pd.DataFrame = None,
    data_path: str = DEFAULT_DATA_PATH,
    split_meta: Dict = None,
    artifact_path: str = DEFAULT_ARTIFACT_PATH,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load data and split into (train, val, train_full, test) dataframes.

    Returns
    -------
    train_df, val_df, train_full_df, test_df
    """
    if df is None:
        df = pd.read_csv(data_path)

    if split_meta is None:
        split_meta = load_split_metadata(artifact_path)

    rel = df[df["is_data_reliable"] == True].copy()
    rel["date"] = pd.to_datetime(rel["date"])
    rel = rel.sort_values("date").reset_index(drop=True)

    train_start = pd.Timestamp(split_meta["train"]["start_date"])
    train_end = pd.Timestamp(split_meta["train"]["end_date"])
    val_start = pd.Timestamp(split_meta["val"]["start_date"])
    val_end = pd.Timestamp(split_meta["val"]["end_date"])
    train_full_end = pd.Timestamp(split_meta["train_full"]["end_date"])
    test_start = pd.Timestamp(split_meta["test"]["start_date"])
    test_end = pd.Timestamp(split_meta["test"]["end_date"])

    train_df = rel[(rel["date"] >= train_start) & (rel["date"] <= train_end)].copy()
    val_df = rel[(rel["date"] >= val_start) & (rel["date"] <= val_end)].copy()
    train_full_df = rel[(rel["date"] >= train_start) & (rel["date"] <= train_full_end)].copy()
    test_df = rel[(rel["date"] >= test_start) & (rel["date"] <= test_end)].copy()

    return train_df, val_df, train_full_df, test_df


if __name__ == "__main__":
    df = pd.read_csv(DEFAULT_DATA_PATH)
    meta = compute_chronological_split(df)
    save_split_metadata(meta, DEFAULT_ARTIFACT_PATH)
    print("Split summary:")
    print(f"  Train:      {meta['train']['start_date']} to {meta['train']['end_date']} ({meta['train']['n_rows']} rows, {meta['split_ratios']['train_fraction_of_total']*100:.1f}%)")
    print(f"  Validation: {meta['val']['start_date']} to {meta['val']['end_date']} ({meta['val']['n_rows']} rows, {meta['split_ratios']['val_fraction_of_total']*100:.1f}%)")
    print(f"  Train Full: {meta['train_full']['start_date']} to {meta['train_full']['end_date']} ({meta['train_full']['n_rows']} rows, {meta['split_ratios']['train_full_fraction_of_total']*100:.1f}%)")
    print(f"  Test:       {meta['test']['start_date']} to {meta['test']['end_date']} ({meta['test']['n_rows']} rows, {meta['split_ratios']['test_fraction_of_total']*100:.1f}%)")

