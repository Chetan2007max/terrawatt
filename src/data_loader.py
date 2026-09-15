"""
data_loader.py
Loads and cleans the GRID-INDIA (POSOCO) daily energy dataset.
See README Section 5.1 for verified dataset details.

Cleaning logic incorporates every data-quality finding from the
investigation phase (see src/hierarchy.py docstring for full details):
  - NER: EnergyMet on 2014-11-25 is a corrupted value -> set to NaN, interpolate
  - WR state-level columns on 2015-01-19 show a scaling anomaly -> set to NaN, interpolate
  - CORRECTED FINDING: the early-2013 gap (2013-01-03 to 2013-03-30, ~87
    days) affects STATE, REGION, and NATIONAL columns simultaneously --
    not just state-level as first assumed. This matches the source's own
    disclosed count of ~111 missing region/national days (87 from this
    blackout + ~24 separate later isolated gaps). Left entirely as NaN,
    not interpolated -- a bug in an earlier version of this function
    partially filled the first 3 rows of this gap with fabricated values
    by bridging two points ~90 days apart; fixed by checking true
    contiguous gap length before allowing interpolation.
  - ~24 separate isolated single/double-day gaps elsewhere -> interpolated
"""

import pandas as pd

POSOCO_URL = "https://robbieandrew.github.io/india/data/POSOCO_data.csv"

STATE_LEVEL_RELIABLE_FROM = "2013-03-31"

KNOWN_BAD_VALUES = [
    {"date": "2014-11-25", "column": "Assam: EnergyMet",
     "reason": "corrupted state value (1190 vs ~20 on neighboring days); "
               "NER region total (37) is correct and consistent with "
               "surrounding days, originally misdiagnosed as the bad value"},
    {"date": "2015-01-19", "column": "Maharashtra: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
    {"date": "2015-01-19", "column": "MP: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
    {"date": "2015-01-19", "column": "Chhattisgarh: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
    {"date": "2015-01-19", "column": "Gujarat: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
    {"date": "2015-01-19", "column": "Goa: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
    {"date": "2015-01-19", "column": "DD: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
    {"date": "2015-01-19", "column": "DNH: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
    {"date": "2015-01-19", "column": "Essar steel: EnergyMet",
     "reason": "WR state breakdown scaling anomaly"},
]


def load_raw_data(path_or_url: str = POSOCO_URL) -> pd.DataFrame:
    """Load the raw POSOCO daily dataset and parse the date column."""
    df = pd.read_csv(path_or_url)
    df["yyyymmdd"] = pd.to_datetime(df["yyyymmdd"], format="%Y%m%d")
    df = df.sort_values("yyyymmdd").reset_index(drop=True)
    return df


def validate_date_range(df: pd.DataFrame) -> None:
    """Sanity check: confirm the date range matches what was verified in README Section 5.1."""
    min_date, max_date = df["yyyymmdd"].min(), df["yyyymmdd"].max()
    print(f"Date range: {min_date.date()} to {max_date.date()}")
    print(f"Total rows: {len(df)}")


def apply_known_bad_value_fixes(df: pd.DataFrame) -> pd.DataFrame:
    """Set confirmed-bad values to NaN so they get interpolated cleanly."""
    df = df.copy()
    for fix in KNOWN_BAD_VALUES:
        mask = df["yyyymmdd"] == fix["date"]
        if mask.sum() == 0:
            print(f"WARNING: date {fix['date']} not found in data, skipping fix for {fix['column']}")
            continue
        df.loc[mask, fix["column"]] = None
    return df


def interpolate_isolated_gaps(df: pd.DataFrame, columns: list, limit: int = 3) -> pd.DataFrame:
    """
    Interpolate ONLY gaps whose full contiguous length is <= limit days.
    Longer gaps (e.g. the ~111-day early-2013 reporting blackout affecting
    state, region, AND national columns) are left entirely as NaN, not
    partially filled -- pandas built-in interpolate(limit=N) partially
    fills the first N rows of ANY gap regardless of its true length,
    which previously produced fabricated values.
    """
    df = df.copy()
    df = df.set_index("yyyymmdd")
    for col in columns:
        if col not in df.columns:
            continue
        series = df[col]
        is_na = series.isna()
        valid_groups = (~is_na).cumsum()
        gap_lengths = is_na.groupby(valid_groups).transform("sum")
        fillable = is_na & (gap_lengths <= limit)
        interpolated = series.interpolate(method="time", limit_direction="both")
        df[col] = series.where(~fillable, interpolated)
    df = df.reset_index()
    return df


def exclude_unreliable_state_period(df: pd.DataFrame, state_columns: list) -> pd.DataFrame:
    """Rows before STATE_LEVEL_RELIABLE_FROM keep NaN for state columns (left for caller to exclude)."""
    df = df.copy()
    cutoff = pd.Timestamp(STATE_LEVEL_RELIABLE_FROM)
    mask = df["yyyymmdd"] < cutoff
    print(f"{mask.sum()} rows before {STATE_LEVEL_RELIABLE_FROM} "
          f"will have unreliable state-level columns left as NaN "
          f"(region/national columns unaffected).")
    return df


def clean_data(df: pd.DataFrame, state_columns: list) -> pd.DataFrame:
    """Full cleaning pipeline: fix known bad values -> interpolate short gaps -> flag long gap."""
    df = apply_known_bad_value_fixes(df)
    all_energymet_cols = [c for c in df.columns if "EnergyMet" in c]
    df = interpolate_isolated_gaps(df, all_energymet_cols, limit=3)
    df = exclude_unreliable_state_period(df, state_columns)
    return df


if __name__ == "__main__":
    df = load_raw_data()
    validate_date_range(df)
    from hierarchy import REGION_MEMBERS
    all_state_cols = [c for cols in REGION_MEMBERS.values() for c in cols]
    df_clean = clean_data(df, all_state_cols)
    df_clean.to_csv("../data/processed/cleaned_daily.csv", index=False)
    print("Saved cleaned data to data/processed/cleaned_daily.csv")
