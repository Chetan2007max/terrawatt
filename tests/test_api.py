"""
test_api.py
Comprehensive automated API tests for TerraWatt v2 (/api/v1).

Tests every versioned endpoint under /api/v1:
1.  GET  /api/v1/health
2.  GET  /api/v1/meta
3.  GET  /api/v1/nodes
4.  GET  /api/v1/forecast
5.  GET  /api/v1/hierarchy
6.  POST /api/v1/scenario
7.  GET  /api/v1/alerts
8.  GET  /api/v1/backtest
9.  GET  /api/v1/metrics
10. POST /api/v1/savings
11. Legacy compatibility routes: /health, /forecast/hierarchy/nodes, /forecast/hierarchy, /forecast/{node_id}, /ingest.
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_api_health(client):
    """Verify /api/v1/health returns 200 OK and version."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["version"] == "v2.0"


def test_api_meta(client):
    """Verify /api/v1/meta returns model metadata, split dates, and library versions."""
    res = client.get("/api/v1/meta")
    assert res.status_code == 200
    data = res.json()
    assert "model_version" in data
    assert data["reliable_data_start"] == "2013-03-31"
    assert data["total_reliable_rows"] == 4914
    assert "train_full_period" in data
    assert "validation_block" in data
    assert "test_holdout_period" in data
    assert "library_versions" in data
    assert "git_hash" in data


def test_api_nodes(client):
    """Verify /api/v1/nodes lists all 51 nodes with hierarchy relations."""
    res = client.get("/api/v1/nodes")
    assert res.status_code == 200
    data = res.json()
    assert data["total_nodes"] == 51
    nodes = {n["node_id"]: n for n in data["nodes"]}
    assert "India" in nodes
    assert "India/NR" in nodes
    assert "India/NR/Delhi" in nodes
    assert nodes["India"]["level"] == "Country"
    assert nodes["India/NR"]["level"] == "Region"
    assert nodes["India/NR/Delhi"]["level"] == "State"


def test_api_forecast(client):
    """Verify /api/v1/forecast returns timeseries with conformal interval bands."""
    res = client.get("/api/v1/forecast?node=India&horizon=14&intervals=true")
    assert res.status_code == 200
    data = res.json()
    assert data["node_id"] == "India"
    assert data["horizon_days"] == 14
    assert len(data["series"]) == 14

    first = data["series"][0]
    assert "reconciled_forecast" in first
    assert "q90_lower" in first
    assert "q90_upper" in first
    assert first["q90_lower"] < first["reconciled_forecast"] < first["q90_upper"]


def test_api_forecast_invalid_node_404(client):
    """Verify 404 for non-existent node."""
    res = client.get("/api/v1/forecast?node=InvalidNodeXYZ")
    assert res.status_code == 404


def test_api_hierarchy_snapshot(client):
    """Verify /api/v1/hierarchy returns 3-level tree and exact mathematical coherence."""
    res = client.get("/api/v1/hierarchy?mode=reconciled")
    assert res.status_code == 200
    data = res.json()
    assert "national" in data
    assert "regions" in data
    assert len(data["regions"]) == 5
    assert len(data["bottom_level"]) == 45
    assert data["is_coherent"] is True
    assert data["coherence_gap_mu"] < 1.0


def test_api_scenario(client):
    """Verify POST /api/v1/scenario returns proportional and covariance-aware allocations."""
    payload = {
        "target_node": "India",
        "pct_change": 10.0,
        "pinned_nodes": ["India/NR"],
        "horizon": 1,
    }
    res = client.post("/api/v1/scenario", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["target_node"] == "India"
    assert data["pct_change"] == 10.0
    assert data["coherence_verified"] is True
    assert "proportional" in data
    assert "covariance_aware" in data
    assert "diff_cov_minus_prop" in data
    assert "disclaimer" in data
    assert "alerts" in data


def test_api_alerts(client):
    """Verify /api/v1/alerts returns heuristic stress indicators with caveat."""
    res = client.get("/api/v1/alerts?region=NR&month=7")
    assert res.status_code == 200
    data = res.json()
    assert "alerts" in data
    assert "caveat" in data
    assert "transmission limits" in data["caveat"]


def test_api_backtest(client):
    """Verify /api/v1/backtest returns actual vs forecasts and error summary."""
    res = client.get("/api/v1/backtest?node=India&horizon=1")
    assert res.status_code == 200
    data = res.json()
    assert data["node_id"] == "India"
    assert "metrics_summary" in data
    assert "unreconciled" in data["metrics_summary"]
    assert "reconciled" in data["metrics_summary"]
    assert len(data["series"]) > 0


def test_api_metrics(client):
    """Verify /api/v1/metrics returns test metrics and conformal coverage."""
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    data = res.json()
    assert len(data["test_metrics_by_level"]) > 0
    assert len(data["test_metrics_by_horizon"]) > 0


def test_api_savings(client):
    """Verify POST /api/v1/savings computes avoided mismatch and rupee valuations."""
    payload = {
        "baseline": "unreconciled",
        "price_under": 6.50,
        "price_over": 3.50,
        "horizon": 1,
    }
    res = client.post("/api/v1/savings", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["baseline_name"] == "unreconciled"
    assert data["annualized_avoided_mismatch_mu"] > 0
    assert "bootstrap_ci_95" in data
    assert "valuation" in data
    assert "planning_inconsistency" in data
    assert "headline_text" in data
    assert "note" in data


def test_legacy_routes_compatibility(client):
    """Verify legacy endpoints (/health, /forecast/hierarchy/nodes, /forecast/hierarchy, /forecast/{node_id}, /ingest)."""
    assert client.get("/health").status_code == 200
    assert client.get("/forecast/hierarchy/nodes").status_code == 200
    assert client.get("/forecast/hierarchy").status_code == 200
    assert client.get("/forecast/India").status_code == 200

    ingest_payload = {"node_id": "India", "date": "2026-09-12", "actual_value": 5330.0}
    ingest_res = client.post("/ingest", json=ingest_payload)
    assert ingest_res.status_code == 200
    assert ingest_res.json()["status"] == "ingested"
