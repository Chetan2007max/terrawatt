"""
features.py
Feature engineering for multi-horizon hierarchical forecasting (Phase B).
Computes calendar, Fourier, holiday, origin-aligned lags, and rolling statistics
without test-period leakage.

Rules enforced:
- For horizon h, every feature uses strictly lags of at least h days (information available at origin t).
- No future values leak into rolling statistics or lags.
- Supports raw target, ratio to trailing 30-day mean, and delta to same weekday last year (364d).
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["MPLCONFIGDIR"] = "/tmp/mplconfig"

import holidays
import numpy as np
import pandas as pd

_INDIA_HOLIDAYS_CACHE = None


def get_india_holidays():
    global _INDIA_HOLIDAYS_CACHE
    if _INDIA_HOLIDAYS_CACHE is None:
        _INDIA_HOLIDAYS_CACHE = holidays.India(years=range(2013, 2027))
    return _INDIA_HOLIDAYS_CACHE


def add_calendar_and_fourier_features(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """
    Add calendar, holiday, festival distance, and Fourier yearly seasonality terms.
    """
    df = df.copy()
    dates = pd.to_datetime(df[date_col])

    df["day_of_week"] = dates.dt.dayofweek
    df["day_of_month"] = dates.dt.day
    df["month"] = dates.dt.month
    df["year"] = dates.dt.year
    df["day_of_year"] = dates.dt.dayofyear
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # India holidays
    in_holidays = get_india_holidays()
    df["is_holiday"] = dates.dt.date.apply(lambda d: d in in_holidays).astype(int)

    # Days to nearest festival / holiday
    hol_dates = pd.to_datetime(list(in_holidays.keys())).sort_values()
    date_vals = dates.values
    diffs = np.abs(date_vals[:, None] - hol_dates.values[None, :]) / np.timedelta64(1, "D")
    df["days_to_nearest_festival"] = diffs.min(axis=1)

    # Fourier terms for yearly seasonality (k=1, 2, 3)
    doy = df["day_of_year"].values
    for k in [1, 2, 3]:
        df[f"sin_doy_k{k}"] = np.sin(2 * np.pi * k * doy / 365.25)
        df[f"cos_doy_k{k}"] = np.cos(2 * np.pi * k * doy / 365.25)

    return df


def build_node_features_for_horizon(
    df_clean: pd.DataFrame,
    target_col: str,
    h: int,
    national_col: str = "India: EnergyMet",
    date_col: str = "date",
) -> pd.DataFrame:
    """
    Build origin-aligned feature matrix for forecasting target_col at horizon h.

    Origin is t (where t = target_date - h).
    Every lag and rolling statistic is computed at or prior to origin t (lag >= h).
    """
    df = df_clean.sort_values(date_col).reset_index(drop=True).copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df = add_calendar_and_fourier_features(df, date_col=date_col)

    y_series = df[target_col]
    k_sw = int(np.ceil(h / 7.0)) * 7  # Most recent same weekday at or before origin

    # Target
    df["target"] = y_series
    df["horizon"] = h

    # Lags at origin
    df["lag_origin"] = y_series.shift(h)
    df["lag_sw_origin"] = y_series.shift(k_sw)
    df["lag_2w_origin"] = y_series.shift(k_sw + 7)
    df["lag_4w_origin"] = y_series.shift(k_sw + 21)
    df["lag_364"] = y_series.shift(364)

    # Rolling statistics at origin (shifted by h so window ends at origin t)
    origin_shifted = y_series.shift(h)
    df["rolling_mean_7_origin"] = origin_shifted.rolling(7).mean()
    df["rolling_std_7_origin"] = origin_shifted.rolling(7).std()
    df["rolling_mean_30_origin"] = origin_shifted.rolling(30).mean()
    df["rolling_std_30_origin"] = origin_shifted.rolling(30).std()

    # Trend handling targets
    # 1. Ratio to trailing 30-day mean at origin
    df["target_ratio_30"] = df["target"] / df["rolling_mean_30_origin"].clip(lower=1e-3)
    # 2. Delta from same weekday last year
    df["target_delta_364"] = df["target"] - df["lag_364"]

    # National context lags for regional & state nodes
    if target_col != national_col and national_col in df.columns:
        nat_s = df[national_col]
        df["national_lag_origin"] = nat_s.shift(h)
        df["national_lag_sw_origin"] = nat_s.shift(k_sw)
        df["national_rolling_mean_7"] = nat_s.shift(h).rolling(7).mean()

    return df


def get_feature_column_names(df_features: pd.DataFrame) -> list:
    """Return strictly the engineered model feature column names."""
    base_features = [
        "day_of_week", "day_of_month", "month", "year", "day_of_year",
        "is_weekend", "is_holiday", "days_to_nearest_festival",
        "sin_doy_k1", "cos_doy_k1", "sin_doy_k2", "cos_doy_k2", "sin_doy_k3", "cos_doy_k3",
        "lag_origin", "lag_sw_origin", "lag_2w_origin", "lag_4w_origin", "lag_364",
        "rolling_mean_7_origin", "rolling_std_7_origin",
        "rolling_mean_30_origin", "rolling_std_30_origin",
    ]
    optional_features = [
        "national_lag_origin", "national_lag_sw_origin", "national_rolling_mean_7",
    ]
    return [c for c in base_features + optional_features if c in df_features.columns]
