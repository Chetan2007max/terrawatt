"""
test_savings.py
Automated tests for Phase E: Savings Estimator (Assumption-Driven).

Verifies:
1. Savings calculation across multiple baselines (unreconciled, seasonal naive 7d, seasonal naive 364d).
2. Block-bootstrap 95% confidence interval computation with block size = 7 days.
3. Rupee valuation matches physical formula: Avoided MU * 1,000,000 kWh/MU * Price/kWh.
4. Low, Base, and High cases have citable dates and sources.
5. Planning inconsistency gap is calculated and reported strictly separately.
6. Headline text matches required wording:
   "Avoided forecast mismatch: X MU per year (Y percent lower than baseline), worth about Z rupees at the prices shown."
7. Mandatory caveat note is present:
   "This estimates avoided over- or under-procurement relative to the stated baseline; it is not electricity physically saved and not evidence of what a government would save."
"""

import pytest
from src.savings import SavingsEstimator, CAVEAT_NOTE, CITABLE_PRICE_SOURCES


@pytest.fixture(scope="module")
def savings_estimator():
    return SavingsEstimator()


def test_savings_estimator_initialization(savings_estimator):
    """Verify SavingsEstimator loads forecasts and cleaned series."""
    assert len(savings_estimator.regions) == 5
    assert len(savings_estimator.reg_uids) == 5
    assert len(savings_estimator.df_forecasts) > 0


def test_savings_calculation_unreconciled_baseline(savings_estimator):
    """Verify calculation against unreconciled independent models baseline."""
    res = savings_estimator.calculate_savings(baseline="unreconciled", horizon=1, n_bootstrap=200)

    assert res["baseline_name"] == "unreconciled"
    assert res["horizon"] == 1
    assert res["test_days_count"] == 983
    assert res["mean_daily_avoided_mismatch_mu"] > 0.0
    assert res["annualized_avoided_mismatch_mu"] > 0.0
    assert res["pct_lower_than_baseline"] > 0.0

    # Annualized = daily * 365.25 within rounding
    daily_calc = res["mean_daily_avoided_mismatch_mu"] * 365.25
    assert abs(res["annualized_avoided_mismatch_mu"] - daily_calc) < 1.0


def test_savings_block_bootstrap_ci(savings_estimator):
    """Verify week-block bootstrap 95% confidence interval bounds are ordered and valid."""
    res = savings_estimator.calculate_savings(baseline="unreconciled", horizon=1, n_bootstrap=300)
    ci = res["bootstrap_ci_95"]

    assert ci["confidence_level_pct"] == 95.0
    assert ci["block_size_days"] == 7
    assert ci["ci_lower_mu_year"] <= res["annualized_avoided_mismatch_mu"]
    assert res["annualized_avoided_mismatch_mu"] <= ci["ci_upper_mu_year"]
    assert ci["ci_lower_mu_year"] < ci["ci_upper_mu_year"]


def test_savings_seasonal_naive_baselines(savings_estimator):
    """Verify savings calculation against seasonal naive 7d and 364d baselines."""
    # 7-day seasonal naive
    res_7d = savings_estimator.calculate_savings(baseline="seasonal_naive_7d", horizon=1, n_bootstrap=100)
    assert res_7d["annualized_avoided_mismatch_mu"] > 10000.0
    assert res_7d["pct_lower_than_baseline"] > 30.0

    # 364-day seasonal naive
    res_364d = savings_estimator.calculate_savings(baseline="seasonal_naive_364d", horizon=1, n_bootstrap=100)
    assert res_364d["annualized_avoided_mismatch_mu"] > 50000.0
    assert res_364d["pct_lower_than_baseline"] > 50.0


def test_savings_rupee_valuation_cases(savings_estimator):
    """Verify rupee valuations, conversions (Rs to Crores), and citable sources."""
    res = savings_estimator.calculate_savings(baseline="unreconciled", price_under=6.50, price_over=3.50)
    val = res["valuation"]

    assert "user_case" in val
    assert "low_case" in val
    assert "base_case" in val
    assert "high_case" in val

    # Verify rupee to crore relationship: 1 Crore = 10,000,000 Rupees
    u_inr = val["user_case"]["value_rupees"]
    u_cr = val["user_case"]["value_crores"]
    assert abs(u_inr / 1e7 - u_cr) < 0.1

    # Low < Base < High
    assert val["low_case"]["value_crores"] < val["base_case"]["value_crores"]
    assert val["base_case"]["value_crores"] < val["high_case"]["value_crores"]

    # Verify citations exist with dates
    for c in ["low_case", "base_case", "high_case"]:
        assert "date" in val[c]["citation"]
        assert "source" in val[c]["citation"]


def test_savings_planning_inconsistency_separate(savings_estimator):
    """Verify planning inconsistency gap is computed and reported separately."""
    res = savings_estimator.calculate_savings(baseline="unreconciled", horizon=1)
    plan = res["planning_inconsistency"]

    assert "mean_daily_gap_mu" in plan
    assert "annualized_gap_mu" in plan
    assert plan["mean_daily_gap_mu"] > 0.0
    assert plan["annualized_gap_mu"] > 0.0
    assert "not added to avoided physical mismatch" in plan["note"]


def test_savings_headline_and_caveat_text(savings_estimator):
    """Verify standard headline formatting and mandatory caveat note."""
    res = savings_estimator.calculate_savings(baseline="unreconciled", horizon=1)

    assert "Avoided forecast mismatch:" in res["headline_text"]
    assert "MU per year" in res["headline_text"]
    assert "percent lower than baseline" in res["headline_text"]
    assert "worth about" in res["headline_text"]

    assert res["note"] == CAVEAT_NOTE
    assert "electricity physically saved" in res["note"]

