"""
model_service.py
Loads the saved reconciled forecast data once at startup and serves
it by node ID. See README Section 5.7.
"""

import pandas as pd
import os

RECONCILED_FORECASTS_PATH = "data/processed/reconciled_forecasts_mint_shrink.csv"

_forecast_data = None


def load_forecasts():
    """Load reconciled forecasts into memory once. Called at API startup."""
    global _forecast_data
    if not os.path.exists(RECONCILED_FORECASTS_PATH):
        raise FileNotFoundError(
            f"{RECONCILED_FORECASTS_PATH} not found -- run the reconciliation "
            "pipeline first to generate this file."
        )
    df = pd.read_csv(RECONCILED_FORECASTS_PATH)
    rec_col = [c for c in df.columns if "MinTrace" in c][0]
    df = df.rename(columns={rec_col: "reconciled_forecast", "y_hat": "base_forecast"})
    _forecast_data = df
    return df


def get_available_nodes() -> list:
    """Return all node IDs available in the loaded forecast data."""
    if _forecast_data is None:
        load_forecasts()
    return sorted(_forecast_data["unique_id"].unique().tolist())


def get_forecast_for_node(node_id: str) -> list:
    """
    Return the forecast time series for a single node, as a list of
    {date, base_forecast, reconciled_forecast} dicts. Raises KeyError
    if the node_id doesn't exist.
    """
    if _forecast_data is None:
        load_forecasts()

    sub = _forecast_data[_forecast_data["unique_id"] == node_id]
    if len(sub) == 0:
        raise KeyError(f"Node '{node_id}' not found. See /forecast/hierarchy/nodes for valid IDs.")

    sub = sub.sort_values("ds")
    return [
        {
            "date": row["ds"],
            "base_forecast": round(row["base_forecast"], 2),
            "reconciled_forecast": round(row["reconciled_forecast"], 2),
        }
        for _, row in sub.iterrows()
    ]


def get_full_hierarchy_snapshot(date: str = None) -> dict:
    """
    Return every node's reconciled forecast for a single date (the
    latest available date if none specified), organized by hierarchy
    level for easy inspection.
    """
    if _forecast_data is None:
        load_forecasts()

    if date is None:
        date = _forecast_data["ds"].max()

    snapshot = _forecast_data[_forecast_data["ds"] == date]
    if len(snapshot) == 0:
        raise KeyError(f"No forecast data for date '{date}'.")

    result = {"date": date, "national": None, "regions": {}, "bottom_level": {}}
    for _, row in snapshot.iterrows():
        uid = row["unique_id"]
        value = round(row["reconciled_forecast"], 2)
        parts = uid.split("/")
        if len(parts) == 1:
            result["national"] = value
        elif len(parts) == 2:
            result["regions"][parts[1]] = value
        else:
            result["bottom_level"][uid] = value

    return result


# In-memory store for ingested "live" telemetry, simulating a streaming
# system's recent-data buffer. In a real production system this would
# be a database/message queue; kept in-memory here for simplicity.
# Design decision: we deliberately do NOT retrain a model on every
# single ingested row -- that is not how real streaming forecast
# systems work (they batch-retrain periodically on accumulated data).
# Instead, ingested actuals are stored and can be compared against the
# existing forecast for that date, and would feed the NEXT scheduled
# batch retrain.
_ingested_actuals = []


def ingest_actual(node_id: str, date: str, actual_value: float) -> dict:
    """
    Record a new incoming actual value for a node/date, simulating
    streaming telemetry. Compares against the existing forecast for
    that date/node if one exists, to report forecast error live.
    """
    global _forecast_data
    if _forecast_data is None:
        load_forecasts()

    record = {"node_id": node_id, "date": date, "actual_value": actual_value}
    _ingested_actuals.append(record)

    full_uid_candidates = _forecast_data[_forecast_data["unique_id"].str.endswith(node_id)]
    existing = full_uid_candidates[full_uid_candidates["ds"] == date]

    result = {"status": "ingested", "record": record, "total_ingested": len(_ingested_actuals)}
    if len(existing) > 0:
        forecasted = float(existing.iloc[0]["reconciled_forecast"])
        error = actual_value - forecasted
        error_pct = (error / actual_value * 100) if actual_value != 0 else None
        result["comparison"] = {
            "reconciled_forecast": round(forecasted, 2),
            "actual": actual_value,
            "error": round(error, 2),
            "error_pct": round(error_pct, 2) if error_pct is not None else None,
        }
    else:
        result["comparison"] = None
        result["note"] = "No existing forecast found for this date/node to compare against."

    return result


def get_ingested_history() -> list:
    """Return everything ingested so far this session."""
    return _ingested_actuals
