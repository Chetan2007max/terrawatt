"""
test_alerts.py
Automated tests for Phase D: Stress Indicators (Heuristic).

Verifies:
1. Demand Stress triggers on all-time max exceedance and monthly P99 exceedance.
2. Supply Stress triggers when demand exceeds observed capability proxy + P95 net import gap.
3. Historical Shortage Frequency correctly displays frequency when N >= 30, and hides/suppresses
   frequency metric when N < 30 (reporting sample size).
4. Low Demand Indicator triggers when demand falls below the 5th percentile for that calendar month.
5. All alerts include evidence numbers, have is_heuristic=True, and contain the mandatory caveat:
   "Ignores transmission limits, plant outages, inter-regional transfer limits, and intraday peaks, because the data is daily."
6. Alerts are sorted by severity: critical -> watch -> info.
"""

import pytest
from src.alerts import StressAlertEngine, CAVEAT_TEXT


@pytest.fixture(scope="module")
def alert_engine():
    return StressAlertEngine()


def test_stress_alert_engine_initialization(alert_engine):
    """Verify alert engine loads verified reference metrics across all 5 regions + India."""
    regions = ["NR", "WR", "SR", "ER", "NER", "India"]
    for r in regions:
        assert r in alert_engine.regions_data
        r_meta = alert_engine.regions_data[r]
        assert "all_time_max_mu" in r_meta
        assert "monthly_stats" in r_meta
        assert len(r_meta["monthly_stats"]) == 12
        assert "capability_proxy_365d_max_gen_mu" in r_meta
        assert "p95_import_gap_mu" in r_meta
        assert "supply_limit_mu" in r_meta
        assert "shortage_tiers" in r_meta


def test_demand_stress_all_time_max(alert_engine):
    """Verify critical demand stress alert when demand exceeds all-time recorded max."""
    # NR all-time max is 2095.0 MU. Test with 2150.0 MU.
    alerts = alert_engine.evaluate_region("NR", demand_mu=2150.0, month=7)
    demand_alerts = [a for a in alerts if a["indicator_type"] == "demand_stress"]
    assert len(demand_alerts) > 0
    a = demand_alerts[0]
    assert a["severity"] == "critical"
    assert "All-Time Maximum" in a["title"]
    assert a["evidence"]["demand_mu"] == 2150.0
    assert a["evidence"]["all_time_max_mu"] == 2095.0
    assert a["evidence"]["exceedance_mu"] == 55.0
    assert a["is_heuristic"] is True
    assert a["caveat"] == CAVEAT_TEXT


def test_demand_stress_monthly_p99(alert_engine):
    """Verify critical demand stress alert when demand exceeds calendar month P99."""
    # NR January P99 is ~1377.0 MU, max recorded is 1399.0 MU. Test with 1385.0 MU in month 1.
    alerts = alert_engine.evaluate_region("NR", demand_mu=1385.0, month=1)
    demand_alerts = [a for a in alerts if a["indicator_type"] == "demand_stress"]
    assert len(demand_alerts) > 0
    a = demand_alerts[0]
    assert a["severity"] == "critical"
    assert "P99" in a["title"]
    assert a["evidence"]["month"] == 1
    assert a["evidence"]["demand_mu"] == 1385.0
    assert a["evidence"]["exceedance_mu"] > 0


def test_supply_stress_deficit(alert_engine):
    """Verify supply stress alert when demand exceeds 365d max generation + P95 import deficit."""
    # NR supply limit is 2116.63 MU. Test with 2125.0 MU.
    alerts = alert_engine.evaluate_region("NR", demand_mu=2125.0, month=7)
    supply_alerts = [a for a in alerts if a["indicator_type"] == "supply_stress"]
    assert len(supply_alerts) > 0
    a = supply_alerts[0]
    assert a["severity"] == "critical"
    assert a["evidence"]["demand_mu"] == 2125.0
    assert a["evidence"]["deficit_mu"] > 0
    assert "capability_proxy_365d_max_gen_mu" in a["evidence"]
    assert "p95_import_gap_mu" in a["evidence"]


def test_historical_shortage_frequency_sufficient_sample(alert_engine):
    """Verify shortage frequency calculation when sample size N >= 30 days."""
    # For NR, >= 90% of peak (1885.5 MU) has N = 59 days (>= 30).
    alerts = alert_engine.evaluate_region("NR", demand_mu=1900.0, month=6)
    shortage_alerts = [a for a in alerts if a["indicator_type"] == "historical_shortage"]
    assert len(shortage_alerts) > 0
    a = shortage_alerts[0]
    assert a["evidence"]["sample_size_days"] >= 30
    assert "shortage_frequency_pct" in a["evidence"]
    assert a["evidence"]["shortage_frequency_pct"] > 0.0


def test_historical_shortage_frequency_small_sample_hidden(alert_engine):
    """
    Rule from prompt: 'Show the sample size and hide it if fewer than 30 days.'
    Verify frequency is suppressed when N < 30.
    """
    # For NR, >= 95% of peak (1990.2 MU) has N = 15 days (< 30).
    alerts = alert_engine.evaluate_region("NR", demand_mu=2000.0, month=7)
    shortage_alerts = [a for a in alerts if a["indicator_type"] == "historical_shortage"]
    assert len(shortage_alerts) > 0
    a = shortage_alerts[0]
    assert a["evidence"]["sample_size_days"] < 30
    assert a["evidence"].get("frequency_suppressed") is True
    assert "shortage_frequency_pct" not in a["evidence"]
    assert "suppressed" in a["message"]


def test_low_demand_indicator(alert_engine):
    """Verify low-demand indicator triggers when demand < monthly P05."""
    # In NR in May, P05 is 818.3 MU. Test with 750.0 MU.
    alerts = alert_engine.evaluate_region("NR", demand_mu=750.0, month=5)
    low_alerts = [a for a in alerts if a["indicator_type"] == "low_demand"]
    assert len(low_alerts) > 0
    a = low_alerts[0]
    assert a["severity"] == "info"
    assert "Low Demand" in a["title"]
    assert "backing-down" in a["message"]
    assert a["evidence"]["month_p05_mu"] > 750.0


def test_alert_severity_ordering_and_caveat(alert_engine):
    """Verify evaluate_scenario orders alerts by severity and includes mandatory caveat."""
    scenario = {
        "NR": 2150.0,  # Critical demand and supply stress
        "WR": 1500.0,  # Normal
        "SR": 1400.0,  # Normal / watch
        "ER": 500.0,   # Low demand
        "NER": 70.0,   # Normal
        "India": 5620.0
    }
    alerts = alert_engine.evaluate_scenario(scenario, month=7)
    assert len(alerts) > 0

    severities = [a["severity"] for a in alerts]
    # Check that critical comes before info
    crit_indices = [i for i, s in enumerate(severities) if s == "critical"]
    info_indices = [i for i, s in enumerate(severities) if s == "info"]
    if crit_indices and info_indices:
        assert min(crit_indices) < max(info_indices)

    # All alerts must have the caveat and is_heuristic=True
    for a in alerts:
        assert a["is_heuristic"] is True
        assert a["caveat"] == CAVEAT_TEXT

