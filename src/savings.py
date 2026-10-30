"""
savings.py
Phase E: Savings Estimator (Assumption-Driven) for TerraWatt v2.

Quantifies daily electricity forecast mismatch across the 5 RLDC regions on the
frozen 20% holdout test set (2024-01-04 to 2026-09-12, 983 days).

Key Features:
1. Baseline Selection:
   - "unreconciled": Unreconciled independent base models
   - "seasonal_naive_7d": Same Weekday Last Week (t-7)
   - "seasonal_naive_364d": Same Weekday 364 Days Ago (t-364)
   - "day_ahead_persistence": Day-Ahead Persistence (t-1)
2. Avoided Mismatch:
   - Daily mismatch = sum over regions of |actual - forecast|
   - Avoided mismatch = baseline mismatch - system mismatch, annualized (MU/year)
   - Week-block bootstrap 95% confidence interval (block size = 7 days)
3. Rupee Valuation:
   - User-editable prices with separate rates for over-forecast (surplus distress sale / DSM)
     and under-forecast (shortfall / emergency spot procurement).
   - Low, Base, and High cases with citable Indian power market sources (CERC, IEX).
4. Separate Planning Inconsistency Metric:
   - Average MU gap by which unreconciled regional forecasts disagree with the national forecast.
   - Strictly reported separately; not added to the avoided mismatch figure.
5. Mandatory Caveat:
   "This estimates avoided over- or under-procurement relative to the stated baseline;
    it is not electricity physically saved and not evidence of what a government would save."
"""

import json
import os
from datetime import timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

TEST_FORECASTS_PATH = "artifacts/metrics/reconciled_test_forecasts.csv"
CLEANED_DATA_PATH = "data/processed/cleaned_daily.csv"
CAVEAT_NOTE = (
    "This estimates avoided over- or under-procurement relative to the stated baseline; "
    "it is not electricity physically saved and not evidence of what a government would save."
)

CITABLE_PRICE_SOURCES = {
    "base_case": {
        "price_under_per_kwh": 6.50,
        "price_over_per_kwh": 3.50,
        "blended_average_per_kwh": 5.00,
        "source": "IEX Day-Ahead Market (DAM) average peak clearing price and CERC Deviation Settlement Mechanism (DSM) Regulations 2022/2024",
        "date": "2024-03-31",
        "citation": "CERC Report on Market Monitoring of Power Exchanges in India (FY 2023-24) and DSM Order dated March 2024",
    },
    "low_case": {
        "price_under_per_kwh": 4.50,
        "price_over_per_kwh": 2.50,
        "blended_average_per_kwh": 3.50,
        "source": "Baseload thermal energy charge / off-peak bilateral trade rate",
        "date": "2024-01-01",
        "citation": "CERC Multi-Year Tariff Regulations 2024-29 Energy Charge Rate benchmarks",
    },
    "high_case": {
        "price_under_per_kwh": 9.50,
        "price_over_per_kwh": 4.50,
        "blended_average_per_kwh": 7.00,
        "source": "CERC High-Price Day Ahead Market (HP-DAM) ceiling order and summer peak emergency procurement rate",
        "date": "2024-03-26",
        "citation": "CERC Order in Petition No. 04/SM/2024 capping HP-DAM at ₹10.00/kWh during summer peak months",
    },
}


class SavingsEstimator:
    def __init__(
        self,
        forecasts_path: str = TEST_FORECASTS_PATH,
        cleaned_path: str = CLEANED_DATA_PATH,
    ):
        self.forecasts_path = forecasts_path
        self.cleaned_path = cleaned_path

        if not os.path.exists(self.forecasts_path):
            raise FileNotFoundError(f"Forecasts artifact not found at {self.forecasts_path}")
        if not os.path.exists(self.cleaned_path):
            raise FileNotFoundError(f"Cleaned daily data not found at {self.cleaned_path}")

        self.df_forecasts = pd.read_csv(self.forecasts_path)
        self.rec_col = [c for c in self.df_forecasts.columns if "MinTrace" in c][0]

        df_clean = pd.read_csv(self.cleaned_path)
        rel = df_clean[df_clean["is_data_reliable"] == True].sort_values("date").reset_index(drop=True)
        rel["date"] = pd.to_datetime(rel["date"])
        self.rel = rel.set_index("date")

        self.regions = ["NR", "WR", "SR", "ER", "NER"]
        self.reg_uids = [f"India/{r}" for r in self.regions]

    def _get_baseline_predictions(
        self,
        baseline_name: str,
        test_dates: List[pd.Timestamp],
        piv_y: pd.DataFrame,
        horizon_df: pd.DataFrame,
    ) -> pd.DataFrame:
        """Fetch or compute baseline forecast DataFrame (dates x regions)."""
        if baseline_name in ["unreconciled", "base_model"]:
            piv_base = horizon_df[horizon_df["unique_id"].isin(self.reg_uids)].pivot(
                index="ds", columns="unique_id", values="y_hat"
            )
            return piv_base

        elif baseline_name in ["seasonal_naive_7d", "same_weekday_last_week"]:
            rows = []
            for d in test_dates:
                target_d = pd.Timestamp(d) - timedelta(days=7)
                row = [self.rel.loc[target_d, f"{r}: EnergyMet"] for r in self.regions]
                rows.append(row)
            return pd.DataFrame(rows, index=piv_y.index, columns=self.reg_uids)

        elif baseline_name in ["seasonal_naive_364d", "same_weekday_364d_ago"]:
            rows = []
            for d in test_dates:
                target_d = pd.Timestamp(d) - timedelta(days=364)
                row = [self.rel.loc[target_d, f"{r}: EnergyMet"] for r in self.regions]
                rows.append(row)
            return pd.DataFrame(rows, index=piv_y.index, columns=self.reg_uids)

        elif baseline_name in ["day_ahead_persistence", "persistence"]:
            rows = []
            for d in test_dates:
                target_d = pd.Timestamp(d) - timedelta(days=1)
                row = [self.rel.loc[target_d, f"{r}: EnergyMet"] for r in self.regions]
                rows.append(row)
            return pd.DataFrame(rows, index=piv_y.index, columns=self.reg_uids)

        else:
            raise ValueError(
                f"Unknown baseline: '{baseline_name}'. Supported: "
                "['unreconciled', 'seasonal_naive_7d', 'seasonal_naive_364d', 'day_ahead_persistence']"
            )

    def calculate_savings(
        self,
        baseline: str = "unreconciled",
        price_under: float = 6.50,
        price_over: float = 3.50,
        horizon: int = 1,
        n_bootstrap: int = 1000,
    ) -> Dict[str, Any]:
        """
        Compute avoided forecast mismatch, week-block bootstrap CI, rupee valuation,
        and planning inconsistency.
        """
        h_df = self.df_forecasts[self.df_forecasts["horizon"] == horizon].copy()
        if len(h_df) == 0:
            raise ValueError(f"Horizon {horizon} not found in forecasts.")

        test_dates_str = sorted(h_df["ds"].unique().tolist())
        test_dates = [pd.Timestamp(d) for d in test_dates_str]

        # 1. Actuals and Reconciled forecasts (5 regions)
        piv_y = h_df[h_df["unique_id"].isin(self.reg_uids)].pivot(
            index="ds", columns="unique_id", values="y"
        )
        piv_rec = h_df[h_df["unique_id"].isin(self.reg_uids)].pivot(
            index="ds", columns="unique_id", values=self.rec_col
        )

        # 2. Baseline forecasts
        piv_base = self._get_baseline_predictions(baseline, test_dates, piv_y, h_df)

        # 3. Daily Regional Mismatches
        # Reconciled
        rec_shortfall_daily = np.maximum(0.0, piv_y - piv_rec).sum(axis=1)
        rec_surplus_daily = np.maximum(0.0, piv_rec - piv_y).sum(axis=1)
        rec_mismatch_daily = rec_shortfall_daily + rec_surplus_daily

        # Baseline
        base_shortfall_daily = np.maximum(0.0, piv_y - piv_base).sum(axis=1)
        base_surplus_daily = np.maximum(0.0, piv_base - piv_y).sum(axis=1)
        base_mismatch_daily = base_shortfall_daily + base_surplus_daily

        # Avoided Daily Differences
        avoided_daily = base_mismatch_daily - rec_mismatch_daily
        avoided_shortfall_daily = base_shortfall_daily - rec_shortfall_daily
        avoided_surplus_daily = base_surplus_daily - rec_surplus_daily

        mean_avoided_daily_mu = float(avoided_daily.mean())
        annualized_avoided_mu = mean_avoided_daily_mu * 365.25
        pct_lower = float((base_mismatch_daily.sum() - rec_mismatch_daily.sum()) / base_mismatch_daily.sum() * 100)

        ann_avoided_shortfall = float(avoided_shortfall_daily.mean() * 365.25)
        ann_avoided_surplus = float(avoided_surplus_daily.mean() * 365.25)

        # 4. Week-Block Bootstrap Confidence Interval (block_size = 7 days)
        block_size = 7
        n_days = len(avoided_daily)
        blocks = [avoided_daily.values[i : i + block_size] for i in range(0, n_days, block_size)]

        np.random.seed(42)
        boot_means = []
        for _ in range(n_bootstrap):
            sampled_indices = np.random.choice(len(blocks), size=len(blocks), replace=True)
            sampled_vals = np.concatenate([blocks[idx] for idx in sampled_indices])[:n_days]
            boot_means.append(np.mean(sampled_vals) * 365.25)

        ci_low = float(np.percentile(boot_means, 2.5))
        ci_high = float(np.percentile(boot_means, 97.5))

        # 5. Rupee Valuation Cases
        def compute_val(pu: float, po: float) -> Dict[str, float]:
            val_inr = (ann_avoided_shortfall * pu + ann_avoided_surplus * po) * 1e6
            val_cr = val_inr / 1e7
            return {
                "price_under_per_kwh": pu,
                "price_over_per_kwh": po,
                "value_rupees": round(val_inr, 2),
                "value_crores": round(val_cr, 2),
            }

        user_val = compute_val(price_under, price_over)
        low_val = {**compute_val(4.50, 2.50), "citation": CITABLE_PRICE_SOURCES["low_case"]}
        base_val = {**compute_val(6.50, 3.50), "citation": CITABLE_PRICE_SOURCES["base_case"]}
        high_val = {**compute_val(9.50, 4.50), "citation": CITABLE_PRICE_SOURCES["high_case"]}

        # 6. Planning Inconsistency (reported separately, not added to savings)
        nat_base = h_df[h_df["unique_id"] == "India"].set_index("ds")["y_hat"]
        reg_sum_base = piv_base.sum(axis=1) if baseline in ["unreconciled", "base_model"] else piv_base.sum(axis=1)
        planning_gap_daily = (reg_sum_base - nat_base).abs()
        mean_planning_gap = float(planning_gap_daily.mean())
        ann_planning_gap = mean_planning_gap * 365.25

        # 7. Regional Breakdown
        regional_breakdown = {}
        for r, uid in zip(self.regions, self.reg_uids):
            b_m = float((piv_y[uid] - piv_base[uid]).abs().mean())
            r_m = float((piv_y[uid] - piv_rec[uid]).abs().mean())
            av_yr = (b_m - r_m) * 365.25
            pct_r = ((b_m - r_m) / b_m * 100) if b_m > 0 else 0.0
            regional_breakdown[r] = {
                "baseline_mismatch_mu_day": round(b_m, 2),
                "reconciled_mismatch_mu_day": round(r_m, 2),
                "avoided_mismatch_mu_year": round(av_yr, 1),
                "pct_lower": round(pct_r, 2),
            }

        # 8. Standard Formatted Headline Text
        headline_text = (
            f"Avoided forecast mismatch: {annualized_avoided_mu:,.1f} MU per year "
            f"({pct_lower:.2f} percent lower than baseline), worth about ₹{user_val['value_crores']:,.2f} "
            f"Crores ({user_val['value_rupees']:,.0f} rupees) at the prices shown."
        )

        return {
            "baseline_name": baseline,
            "horizon": horizon,
            "test_days_count": n_days,
            "test_period_start": test_dates_str[0],
            "test_period_end": test_dates_str[-1],
            "mean_daily_baseline_mismatch_mu": round(float(base_mismatch_daily.mean()), 2),
            "mean_daily_reconciled_mismatch_mu": round(float(rec_mismatch_daily.mean()), 2),
            "mean_daily_avoided_mismatch_mu": round(mean_avoided_daily_mu, 2),
            "annualized_avoided_mismatch_mu": round(annualized_avoided_mu, 1),
            "pct_lower_than_baseline": round(pct_lower, 2),
            "bootstrap_ci_95": {
                "ci_lower_mu_year": round(ci_low, 1),
                "ci_upper_mu_year": round(ci_high, 1),
                "confidence_level_pct": 95.0,
                "block_size_days": 7,
                "n_bootstraps": n_bootstrap,
            },
            "regional_breakdown": regional_breakdown,
            "valuation": {
                "user_case": user_val,
                "low_case": low_val,
                "base_case": base_val,
                "high_case": high_val,
            },
            "planning_inconsistency": {
                "mean_daily_gap_mu": round(mean_planning_gap, 2),
                "annualized_gap_mu": round(ann_planning_gap, 1),
                "note": (
                    "Average daily MU discrepancy between the sum of unreconciled regional forecasts "
                    "and the national forecast. Reported separately; not added to avoided physical mismatch."
                ),
            },
            "headline_text": headline_text,
            "note": CAVEAT_NOTE,
            "citable_price_sources": CITABLE_PRICE_SOURCES,
        }
