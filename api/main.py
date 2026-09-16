"""
main.py
FastAPI entrypoint for TerraWatt.
See README Section 5.7 for the endpoint spec.
"""

from fastapi import FastAPI, HTTPException
from api.model_service import (
    load_forecasts, get_available_nodes, get_forecast_for_node, get_full_hierarchy_snapshot,
    ingest_actual, get_ingested_history
)
from api.schemas import IngestPayload

app = FastAPI(
    title="TerraWatt",
    description="Multi-Region Energy Demand Forecasting & Reconciliation Engine"
)


@app.on_event("startup")
def startup_event():
    load_forecasts()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/forecast/hierarchy/nodes")
def list_nodes():
    """List every valid node_id that can be queried via /forecast/{node_id}."""
    return {"nodes": get_available_nodes()}


@app.get("/forecast/hierarchy")
def forecast_hierarchy(date: str = None):
    """Return every node's reconciled forecast for a given date (latest if not specified)."""
    try:
        return get_full_hierarchy_snapshot(date)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/forecast/{node_id:path}")
def forecast_node(node_id: str):
    """Return the full forecast time series for a single node (e.g. 'India', 'India/NR', 'India/NR/Punjab')."""
    try:
        return {"node_id": node_id, "forecast": get_forecast_for_node(node_id)}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/ingest")
def ingest(payload: IngestPayload):
    """
    Simulate streaming telemetry: ingest a new actual value for a
    node/date, and compare it against the existing reconciled forecast
    if one exists. Does NOT trigger live model retraining -- see
    model_service.ingest_actual() docstring for why.
    """
    return ingest_actual(payload.node_id, payload.date, payload.actual_value)


@app.get("/ingest/history")
def ingest_history():
    """Return everything ingested so far this session."""
    return {"history": get_ingested_history()}
