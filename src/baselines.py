"""
baselines.py
Standard benchmarks required for Phase B:
1. Same weekday last week (most recent observed same weekday <= origin).
2. Same weekday 364 days ago (52 weeks ago).
3. Day-ahead LightGBM persistence.
"""

import numpy as np
import pandas as pd


def generate_baseline_forecasts(
    y_series: pd.Series,
    target_dates: pd.DatetimeIndex,
    h: int,
    baseline_name: str,
    day_ahead_predictions: pd.Series = None,
) -> np.ndarray:
    """
    Generate baseline forecasts for target_dates at horizon h.

    Parameters
    ----------
    y_series : pd.Series
        Historical series indexed by pd.Timestamp.
    target_dates : pd.DatetimeIndex
        Dates to forecast (target_date = origin + h).
    h : int
        Forecast horizon (1 to 14).
    baseline_name : str
        'same_weekday_last_week', 'same_weekday_364', or 'day_ahead_persistence'.
    day_ahead_predictions : pd.Series, optional
        Series of 1-day ahead predictions indexed by target date.
    """
    preds = []
    k_sw = int(np.ceil(h / 7.0)) * 7  # e.g. 7 for h=1..7, 14 for h=8..14

    for dt in target_dates:
        dt = pd.Timestamp(dt)
        if baseline_name == "same_weekday_last_week":
            origin_sw_date = dt - pd.Timedelta(days=k_sw)
            val = y_series.get(origin_sw_date, np.nan)
        elif baseline_name == "same_weekday_364":
            dt_364 = dt - pd.Timedelta(days=364)
            val = y_series.get(dt_364, np.nan)
        elif baseline_name == "day_ahead_persistence":
            # Origin is dt - h days. The day-ahead prediction was for origin + 1 day
            origin_plus_1 = dt - pd.Timedelta(days=h - 1)
            if day_ahead_predictions is not None and origin_plus_1 in day_ahead_predictions.index:
                val = day_ahead_predictions.loc[origin_plus_1]
            else:
                val = y_series.get(dt - pd.Timedelta(days=h), np.nan)
        else:
            raise ValueError(f"Unknown baseline: {baseline_name}")

        preds.append(val)

    return np.array(preds)

