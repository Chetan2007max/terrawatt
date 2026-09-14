"""
main.py
FastAPI entrypoint for TerraWatt.
See README Section 5.7 for the endpoint spec:
    GET  /health
    GET  /forecast/{node_id}
    GET  /forecast/hierarchy
    POST /ingest
TODO (Days 39-46).
"""

from fastapi import FastAPI

app = FastAPI(title="TerraWatt", description="Multi-Region Energy Demand Forecasting & Reconciliation Engine")


@app.get("/health")
def health():
    return {"status": "ok"}
