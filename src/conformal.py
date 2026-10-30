"""
conformal.py
Split-conformal prediction intervals for TerraWatt v2 (Phase B).
Computes finite-sample calibrated prediction intervals per node and horizon
using validation block residuals.

Enforces:
- Intervals computed purely from validation residuals (no test leakage).
- Empirical coverage evaluated on frozen 20% test holdout.
"""

import numpy as np
import pandas as pd


def compute_conformal_quantiles(
    y_val: np.ndarray,
    y_val_pred: np.ndarray,
    coverage_levels: list = [0.90, 0.95],
) -> dict:
    """
    Compute split-conformal calibration radius for each nominal coverage level.

    q_alpha = quantile(|y - y_hat|, ceil((n + 1) * (1 - alpha)) / n)
    """
    residuals = np.abs(y_val - y_val_pred)
    n = len(residuals)
    if n == 0:
        return {cov: 0.0 for cov in coverage_levels}

    quantiles = {}
    for cov in coverage_levels:
        # Standard conformal quantile with finite-sample correction
        q_level = min(1.0, np.ceil((n + 1) * cov) / n)
        q_val = np.quantile(residuals, q_level)
        quantiles[cov] = round(float(q_val), 2)

    return quantiles


def evaluate_conformal_coverage(
    y_test: np.ndarray,
    y_test_pred: np.ndarray,
    q_radius: float,
) -> dict:
    """
    Evaluate empirical coverage and average interval width on test set.
    """
    mask = ~np.isnan(y_test) & ~np.isnan(y_test_pred)
    yt = y_test[mask]
    yp = y_test_pred[mask]

    if len(yt) == 0:
        return {"empirical_coverage": np.nan, "avg_width": np.nan, "n_samples": 0}

    lower_bound = np.maximum(0.0, yp - q_radius)
    upper_bound = yp + q_radius

    covered = (yt >= lower_bound) & (yt <= upper_bound)
    emp_coverage = float(np.mean(covered) * 100)
    avg_width = float(np.mean(upper_bound - lower_bound))

    return {
        "empirical_coverage": round(emp_coverage, 2),
        "avg_width": round(avg_width, 2),
        "n_samples": int(len(yt)),
    }

