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
                             test_start: str = "2025-01-01") -> dict:
    """Full train+evaluate pipeline for a single hierarchy node."""
    df_features = build_features(df_clean, target_col=target_col)

    feature_cols = get_feature_columns(df_features, target_col)
    df_model = df_features.dropna(subset=[target_col] + feature_cols)

    train, test = train_test_split_by_date(df_model, test_start)

    if len(test) == 0:
        raise ValueError(f"No test rows after {test_start} for {target_col} -- check date range.")

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
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)

    mape = mean_absolute_percentage_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    mae = mean_absolute_error(y_test, preds)

    return {
        "target_col": target_col,
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
