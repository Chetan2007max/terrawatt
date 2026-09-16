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
