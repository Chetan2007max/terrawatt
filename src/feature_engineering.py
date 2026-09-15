"""
feature_engineering.py
Daily-granularity feature engineering (NOT hourly -- see README Section 5.2).

Builds, for a given target column (e.g. "NR: EnergyMet"):
  - Calendar features: day-of-week, day-of-month, month, day-of-year, is_weekend
  - Holiday feature: is_holiday (India national holidays)
  - Lag features: t-1, t-7, t-30, t-365 days
  - Rolling statistics: 7-day and 30-day rolling mean/std

IMPORTANT (data leakage): lag and rolling features are computed using
pandas .shift() and .rolling(), which are inherently backward-looking,
so this is safe by construction as long as the dataframe stays sorted
by date. The rolling functions shift by 1 day BEFORE computing the
window, so the current day's own value is never included in its own
rolling statistic. The t-365 lag will be NaN for the first year of
any series -- expected, not a bug.
"""

import pandas as pd
import holidays

INDIA_HOLIDAYS = holidays.India()


def add_calendar_features(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """Add day-of-week, day-of-month, month, day-of-year, is_weekend."""
    df = df.copy()
    df["day_of_week"] = df[date_col].dt.dayofweek  # 0=Monday
    df["day_of_month"] = df[date_col].dt.day
    df["month"] = df[date_col].dt.month
    df["day_of_year"] = df[date_col].dt.dayofyear
    df["year"] = df[date_col].dt.year
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    return df


def add_holiday_feature(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """Add is_holiday using India's national holiday calendar."""
    df = df.copy()
    df["is_holiday"] = df[date_col].dt.date.apply(lambda d: d in INDIA_HOLIDAYS).astype(int)
    return df


def add_lag_features(df: pd.DataFrame, target_col: str, lags: list = [1, 7, 30, 365]) -> pd.DataFrame:
    """Add lag features for target_col. Assumes df is sorted by date ascending."""
    df = df.copy()
    for lag in lags:
        df[f"{target_col}_lag_{lag}"] = df[target_col].shift(lag)
    return df


def add_rolling_features(df: pd.DataFrame, target_col: str, windows: list = [7, 30]) -> pd.DataFrame:
    """Add rolling mean/std for target_col, shifted by 1 day to avoid leaking the current value."""
    df = df.copy()
    shifted = df[target_col].shift(1)
    for window in windows:
        df[f"{target_col}_rolling_mean_{window}"] = shifted.rolling(window).mean()
        df[f"{target_col}_rolling_std_{window}"] = shifted.rolling(window).std()
    return df


def build_features(df: pd.DataFrame, target_col: str, date_col: str = "date") -> pd.DataFrame:
    """Full feature engineering pipeline for a single target column (one hierarchy node)."""
    df = df.sort_values(date_col).reset_index(drop=True)
    df = add_calendar_features(df, date_col)
    df = add_holiday_feature(df, date_col)
    df = add_lag_features(df, target_col)
    df = add_rolling_features(df, target_col)
    return df
