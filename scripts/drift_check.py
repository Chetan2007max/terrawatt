#!/usr/bin/env python3
"""
scripts/drift_check.py
Compares recent actual demand against reconciled forecasts to detect distribution drift,
model degradation, or data telemetry staleness.

Emits a structured report and saves state to artifacts/metrics/drift_status.json,
which is surfaced by the /api/v1/meta endpoint.
"""

import argparse
import datetime
import json
import os
import sys
from typing import Any, Dict

import numpy as np
import pandas as pd

DEFAULT_FORECASTS_PATH = "artifacts/metrics/reconciled_test_forecasts.csv"
DEFAULT_OUTPUT_PATH = "artifacts/metrics/drift_status.json"
DEFAULT_WAPE_THRESHOLD = 8.0  # Alert if recent WAPE exceeds 8% on national load


def run_drift_check(
    forecasts_path: str = DEFAULT_FORECASTS_PATH,
    output_path: str = DEFAULT_OUTPUT_PATH,
    window_days: int = 30,
    threshold_wape: float = DEFAULT_WAPE_THRESHOLD,
    reference_date: str = None,
) -> Dict[str, Any]:
    """Evaluates recent holdout tracking error and data staleness."""
    if not os.path.exists(forecasts_path):
        raise FileNotFoundError(f"Forecasts artifact not found at: {forecasts_path}")

    df = pd.read_csv(forecasts_path)
    rec_cols = [c for c in df.columns if "MinTrace" in c]
    if not rec_cols:
        raise ValueError("No MinTrace reconciled column found in forecasts CSV.")
    rec_col = rec_cols[0]

    # Filter to National (India) day-ahead (h=1) predictions
    df_h1 = df[(df["unique_id"] == "India") & (df["horizon"] == 1)].sort_values("ds")
    if len(df_h1) == 0:
        raise ValueError("No National h=1 forecast records found.")

    latest_date_str = df_h1["ds"].max()
    latest_date = datetime.date.fromisoformat(latest_date_str)

    if reference_date:
        ref_date = datetime.date.fromisoformat(reference_date)
    else:
        # Default reference is the latest data date itself in offline analysis
        ref_date = latest_date

    days_stale = (ref_date - latest_date).days

    # Extract recent evaluation window
    actual_col = "y" if "y" in df.columns else "actual"
    recent_df = df_h1.tail(window_days)
    actuals = recent_df[actual_col].values
    preds = recent_df[rec_col].values

    abs_errors = np.abs(actuals - preds)
    recent_mae = float(np.mean(abs_errors))
    recent_wape = float((np.sum(abs_errors) / np.sum(actuals)) * 100)

    # Check drift and staleness conditions
    drift_detected = False
    staleness_warning = None
    status = "HEALTHY"

    if recent_wape > threshold_wape:
        drift_detected = True
        status = "DRIFT_ALERT"
        staleness_warning = (
            f"Model drift alert: 30-day rolling WAPE ({recent_wape:.2f}%) exceeds "
            f"threshold ({threshold_wape:.2f}%). Re-tuning recommended."
        )

    if days_stale > 14:
        drift_detected = True
        status = "STALE_DATA_ALERT"
        staleness_warning = (
            f"Data staleness alert: Latest telemetry date ({latest_date_str}) is "
            f"{days_stale} days older than reference date ({ref_date.isoformat()}). "
            "Ingest recent telemetry and run pipeline retraining."
        )

    retraining_instructions = (
        "To retrain models with updated data: execute `python scripts/cli.py train --seed 42`, "
        "recompute holdout metrics via `python scripts/cli.py evaluate`, and redeploy."
    )

    result = {
        "drift_detected": drift_detected,
        "status": status,
        "last_checked_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "latest_telemetry_date": latest_date_str,
        "reference_date": ref_date.isoformat(),
        "days_since_latest_telemetry": max(0, days_stale),
        "evaluation_window_days": len(recent_df),
        "recent_national_mae_mu_day": round(recent_mae, 2),
        "recent_national_wape_percent": round(recent_wape, 2),
        "threshold_wape_percent": threshold_wape,
        "staleness_warning": staleness_warning,
        "retraining_instructions": retraining_instructions,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    return result


def main():
    parser = argparse.ArgumentParser(description="TerraWatt v2 Data Drift & Telemetry Check")
    parser.add_argument("--forecasts", default=DEFAULT_FORECASTS_PATH, help="Path to forecasts CSV")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PATH, help="Output path for drift JSON")
    parser.add_argument("--window", type=int, default=30, help="Rolling evaluation window in days")
    parser.add_argument("--threshold-wape", type=float, default=DEFAULT_WAPE_THRESHOLD, help="WAPE alert threshold")
    parser.add_argument("--ref-date", type=str, default=None, help="Optional reference date (YYYY-MM-DD)")
    args = parser.parse_args()

    try:
        report = run_drift_check(
            forecasts_path=args.forecasts,
            output_path=args.output,
            window_days=args.window,
            threshold_wape=args.threshold_wape,
            reference_date=args.ref_date,
        )
        print("=== TerraWatt v2 Drift & Staleness Report ===")
        print(f"Status:                      {report['status']}")
        print(f"Latest Telemetry Date:       {report['latest_telemetry_date']}")
        print(f"Recent National MAE:         {report['recent_national_mae_mu_day']} MU/day")
        print(f"Recent National WAPE:        {report['recent_national_wape_percent']}%")
        print(f"Threshold WAPE:              {report['threshold_wape_percent']}%")
        print(f"Drift Detected:              {report['drift_detected']}")
        if report["staleness_warning"]:
            print(f"Warning:                     {report['staleness_warning']}")
        print(f"Report written to:           {args.output}")
    except Exception as e:
        print(f"Drift check failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
