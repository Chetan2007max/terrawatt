"""
main.py
FastAPI application entrypoint for TerraWatt v2.
Implements versioned REST API routes under /api/v1:
  - GET  /api/v1/health
  - GET  /api/v1/meta
  - GET  /api/v1/nodes
  - GET  /api/v1/forecast
  - GET  /api/v1/hierarchy
  - POST /api/v1/scenario
  - GET  /api/v1/alerts
  - GET  /api/v1/backtest
  - GET  /api/v1/metrics
  - POST /api/v1/savings

Maintains backward compatibility for legacy frontend endpoints (/health, /forecast/*, /ingest).
Preloads all models and artifacts at startup (never retrains inside a request).
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.hierarchy import REGIONS
from api.model_service import (
    get_all_nodes,
    get_backtest_data,
    get_forecast_for_node,
    get_hierarchy_snapshot,
    get_meta_info,
    get_metrics_data,
    get_savings_data,
    get_stress_alerts,
    load_all_artifacts,
    simulate_scenario,
)
from api.schemas import (
    AlertsResponse,
    BacktestResponse,
    ForecastResponse,
    HealthResponse,
    HierarchySnapshotResponse,
    IngestPayload,
    MetaResponse,
    MetricsResponse,
    NodesResponse,
    SavingsRequest,
    SavingsResponse,
    ScenarioRequest,
    ScenarioResponse,
)

# Structured Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("terrawatt.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TerraWatt v2: Preloading artifacts and models...")
    load_all_artifacts()
    logger.info("TerraWatt v2 ready to serve.")
    yield


app = FastAPI(
    title="TerraWatt v2 API",
    description=(
        "Hierarchical Electricity Demand Forecasting, Coherent Reconciliation, "
        "What-If Scenario Simulation, Stress Indicators, and Avoided Mismatch Estimator."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware (supports wildcard and explicit development ports)
cors_env = os.environ.get("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else [
        "*",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False if ("*" in origins) else True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
    )
    return response


# ==============================================================================
# Versioned Routes: /api/v1
# ==============================================================================

@app.get("/api/v1/health", response_model=HealthResponse, tags=["System"])
def api_health():
    """Health check endpoint."""
    return {"status": "ok", "version": "v2.0"}


@app.get("/api/v1/meta", response_model=MetaResponse, tags=["System"])
def api_meta():
    """Returns dataset dates, split metadata, library versions, and git hash."""
    return get_meta_info()


@app.get("/api/v1/nodes", response_model=NodesResponse, tags=["Hierarchy"])
def api_nodes():
    """Lists all 51 nodes across National, Regional, and State levels with hierarchy relations."""
    nodes = get_all_nodes()
    return {"total_nodes": len(nodes), "nodes": nodes}


@app.get("/api/v1/forecast", response_model=ForecastResponse, tags=["Forecast"])
def api_forecast(
    node: str = Query("India", description="Node unique_id (e.g. 'India', 'India/NR', 'India/NR/Delhi')"),
    horizon: int = Query(14, ge=1, le=14, description="Forecast horizon in days (1..14)"),
    intervals: bool = Query(True, description="Whether to include split-conformal prediction intervals"),
):
    """
    Returns multi-horizon forecast timeseries for a given node with split-conformal
    prediction interval bands (90% and 95%).
    """
    try:
        return get_forecast_for_node(node_id=node, horizon_days=horizon, include_intervals=intervals)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/v1/hierarchy", response_model=HierarchySnapshotResponse, tags=["Hierarchy"])
def api_hierarchy(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD (defaults to latest available)"),
    horizon: int = Query(1, ge=1, le=14, description="Forecast horizon 1..14"),
    mode: str = Query("reconciled", pattern="^(actual|unreconciled|reconciled)$", description="Display mode"),
):
    """
    Returns complete 3-level hierarchy snapshot (National, 5 Regions, 45 Leaves)
    and reports the exact mathematical coherence gap in MU/day.
    """
    try:
        return get_hierarchy_snapshot(date=date, horizon=horizon, mode=mode)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/v1/scenario", response_model=ScenarioResponse, tags=["Scenario Simulation"])
def api_scenario(payload: ScenarioRequest):
    """
    Simulates a what-if demand shock at any node and computes both Proportional
    and Covariance-Aware allocations across all 51 nodes, verifying mathematical coherence.
    Includes historical bounds warnings, physical non-negativity checks, and heuristic stress alerts.
    """
    try:
        return simulate_scenario(
            target_node=payload.target_node,
            delta=payload.delta,
            pct_change=payload.pct_change,
            new_value=payload.new_value,
            pinned_nodes=payload.pinned_nodes,
            date=payload.date,
            horizon=payload.horizon,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/alerts", response_model=AlertsResponse, tags=["Stress Indicators"])
def api_alerts(
    date: Optional[str] = Query(None, description="Reference date YYYY-MM-DD"),
    region: Optional[str] = Query(None, description="Filter for specific region: NR, WR, SR, ER, NER, or India"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Calendar month 1..12"),
):
    """
    Evaluates 4 heuristic stress indicators: Demand Stress, Supply Deficit,
    Historical Shortage Frequency (with sample size gating), and Low Demand Backing-Down.
    """
    return get_stress_alerts(date=date, region=region, month=month)


@app.get("/api/v1/backtest", response_model=BacktestResponse, tags=["Backtesting"])
def api_backtest(
    node: str = Query("India", description="Node unique_id"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    horizon: int = Query(1, ge=1, le=14, description="Forecast horizon 1..14"),
):
    """
    Returns actual vs unreconciled vs reconciled forecasts side-by-side on the holdout test set,
    with calculated absolute errors and summary metrics (MAE, RMSE, WAPE).
    """
    try:
        return get_backtest_data(node_id=node, start_date=start_date, end_date=end_date, horizon=horizon)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/v1/metrics", response_model=MetricsResponse, tags=["Evaluation"])
def api_metrics(
    level: Optional[str] = Query(None, description="Filter by level: National, Regional, State/Bottom, All Nodes"),
    horizon: Optional[int] = Query(None, ge=1, le=14, description="Filter by horizon 1..14"),
):
    """Returns official frozen test set metrics by hierarchy level and horizon."""
    return get_metrics_data(level=level, horizon=horizon)


@app.post("/api/v1/savings", response_model=SavingsResponse, tags=["Savings Estimator"])
def api_savings(payload: SavingsRequest):
    """
    Estimates avoided forecast mismatch (MU/year) relative to selected baseline,
    computes 95% week-block bootstrap confidence interval, rupee valuation across Low,
    Base, and High market benchmarks, and reports planning inconsistency separately.
    """
    try:
        return get_savings_data(
            baseline=payload.baseline,
            price_under=payload.price_under,
            price_over=payload.price_over,
            horizon=payload.horizon,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==============================================================================
# Legacy Compatibility Routes (for backward compatibility with v1 frontend)
# ==============================================================================

@app.get("/health", tags=["Legacy"])
def legacy_health():
    return {"status": "ok"}


@app.get("/forecast/hierarchy/nodes", tags=["Legacy"])
def legacy_nodes():
    nodes = get_all_nodes()
    return {"nodes": [n["node_id"] for n in nodes]}


@app.get("/forecast/hierarchy", tags=["Legacy"])
def legacy_hierarchy(date: Optional[str] = None):
    try:
        snap = get_hierarchy_snapshot(date=date, horizon=1, mode="reconciled")
        return {
            "date": snap["date"],
            "national": snap["national"]["value"],
            "regions": {r: snap["regions"][r]["value"] for r in REGIONS},
            "bottom_level": {b: snap["bottom_level"][b]["value"] for b in snap["bottom_level"]},
        }
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/forecast/{node_id:path}", tags=["Legacy"])
def legacy_forecast(node_id: str):
    try:
        res = get_forecast_for_node(node_id=node_id, horizon_days=14, include_intervals=False)
        return {
            "node_id": node_id,
            "forecast": [
                {
                    "date": p["ds"],
                    "base_forecast": p["base_forecast"],
                    "reconciled_forecast": p["reconciled_forecast"],
                }
                for p in res["series"]
            ]
        }
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


_ingested_records = []

@app.post("/ingest", tags=["Legacy"])
def legacy_ingest(payload: IngestPayload):
    record = {"node_id": payload.node_id, "date": payload.date, "actual_value": payload.actual_value}
    _ingested_records.append(record)
    return {"status": "ingested", "record": record, "total_ingested": len(_ingested_records)}
