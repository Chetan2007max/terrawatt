"""
train_base_models.py
Trains per-node LightGBM base forecasting models. See README Section 5.4.

Uses walk-forward (rolling-origin) validation, NEVER a random split --
random splits leak future information into training for time series
and would produce misleadingly good validation metrics.
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, mean_absolute_error

from src.feature_engineering import build_features


def get_feature_columns(df: pd.DataFrame, target_col: str) -> list:
    """Calendar/holiday features + this node's own lag/rolling columns."""
    calendar_cols = ["day_of_week", "day_of_month", "month", "day_of_year",
                      "year", "is_weekend", "is_holiday"]
    node_specific_cols = [c for c in df.columns if c.startswith(f"{target_col}_lag_")
                           or c.startswith(f"{target_col}_rolling_")]
    return calendar_cols + node_specific_cols


def train_test_split_by_date(df: pd.DataFrame, test_start: str, date_col: str = "date"):
    """Walk-forward split: everything before test_start is train, everything from test_start onward is test."""
    cutoff = pd.Timestamp(test_start)
    train = df[df[date_col] < cutoff].copy()
    test = df[df[date_col] >= cutoff].copy()
    return train, test


def train_lightgbm_for_node(df_clean: pd.DataFrame, target_col: str,
                             test_start: str = "2025-01-01",
                             fallback_test_days: int = 180) -> dict:
    """
    Full train+evaluate pipeline for a single hierarchy node.

    Some nodes (e.g. DD, DNH, Essar steel) have large multi-year gaps
    in their reporting history that happen to overlap test_start entirely
    (confirmed: 152/152 days missing in the Oct2024-Mar2025 window for
    these three). Rather than failing, we fall back to using each node's
    own last `fallback_test_days` of AVAILABLE data as the test set,
    with everything before that as train -- this keeps the pipeline
    working per-node without assuming every series has recent data.
    """
    df_features = build_features(df_clean, target_col=target_col)

    feature_cols = get_feature_columns(df_features, target_col)
    df_model = df_features.dropna(subset=[target_col] + feature_cols)

    train, test = train_test_split_by_date(df_model, test_start)
    used_fallback = False

    if len(test) == 0:
        used_fallback = True
        df_model = df_model.sort_values("date")
        test = df_model.tail(fallback_test_days)
        train = df_model.iloc[:-fallback_test_days]

    if len(test) == 0 or len(train) == 0:
        raise ValueError(f"No usable train/test data for {target_col} even with fallback -- "
                          f"this node likely has too little valid history overall.")

    X_train, y_train = train[feature_cols].copy(), train[target_col]
    X_test, y_test = test[feature_cols].copy(), test[target_col]

    # LightGBM rejects special JSON characters (":", etc.) in feature
    # names, which our columns inherit from the source data (e.g.
    # "NR: EnergyMet_lag_1"). Sanitize for the model only -- the
    # original dataframe/columns elsewhere are untouched.
    safe_names = {c: c.replace(":", "").replace(" ", "_") for c in feature_cols}
    X_train = X_train.rename(columns=safe_names)
    X_test = X_test.rename(columns=safe_names)

    model = lgb.LGBMRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        random_state=42,
        verbosity=-1,
        n_jobs=1,  # avoid OpenMP thread conflicts causing segfaults on macOS
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)

    # MAPE explodes toward infinity when actual values are near zero
    # (division by ~0) -- this is a known mathematical limitation, not
    # a model failure. Confirmed on Goa/RIL JAMNAGAR/Railways_ER ISTS:
    # their MAE is small and genuinely good, but MAPE reports nonsense
    # (e.g. billions of percent). Flag low-magnitude series so callers
    # can report MAE instead of trusting MAPE for them.
    mean_actual = y_test.mean()
    is_low_magnitude = mean_actual < 5  # EnergyMet units; tune as needed

    mape = mean_absolute_percentage_error(y_test, preds) if not is_low_magnitude else float("nan")
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    mae = mean_absolute_error(y_test, preds)

    return {
        "target_col": target_col,
        "used_fallback_split": used_fallback,
        "is_low_magnitude": is_low_magnitude,
        "mean_actual": mean_actual,
        "model": model,
        "train_size": len(train),
        "test_size": len(test),
        "test_dates": test["date"].values,
        "y_test": y_test.values,
        "preds": preds,
        "mape": mape,
        "rmse": rmse,
        "mae": mae,
        "feature_cols": feature_cols,
    }
