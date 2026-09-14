"""
data_loader.py
Loads the GRID-INDIA (POSOCO) daily energy dataset.
See README Section 5.1 for verified dataset details:
  - Source: https://robbieandrew.github.io/india/data/POSOCO_data.csv
  - Granularity: DAILY (not hourly)
  - Date range: 2013-01-02 to present (verify on load, do not assume)
  - Unified hierarchy metric: EnergyMet

TODO (Day 2-3): implement load_raw_data() and basic validation.
"""

import pandas as pd

POSOCO_URL = "https://robbieandrew.github.io/india/data/POSOCO_data.csv"


def load_raw_data(path_or_url: str = POSOCO_URL) -> pd.DataFrame:
    """Load the raw POSOCO daily dataset and parse the date column."""
    df = pd.read_csv(path_or_url)
    df["yyyymmdd"] = pd.to_datetime(df["yyyymmdd"], format="%Y%m%d")
    return df


def validate_date_range(df: pd.DataFrame) -> None:
    """Sanity check: confirm the date range matches what was verified in README Section 5.1."""
    min_date, max_date = df["yyyymmdd"].min(), df["yyyymmdd"].max()
    print(f"Date range: {min_date.date()} to {max_date.date()}")
    print(f"Total rows: {len(df)}")
