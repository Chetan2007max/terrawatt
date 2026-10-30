"""
model_service.py
Service layer for TerraWatt v2 FastAPI backend.
Loads all trained models, conformal calibration tables, scenario engines,
alert estimators, and split artifacts once at startup.
Never retrains inside an API request.
"""

import json
import os
import subprocess
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from src.alerts import StressAlertEngine
from src.hierarchy import REGION_MEMBERS, REGIONS
from src.savings import SavingsEstimator
from src.scenario import ScenarioEngine
from src.split import load_split_metadata

SPLIT_PATH = "artifacts/split.json"
TEST_FORECASTS_PATH = "artifacts/metrics/reconciled_test_forecasts.csv"
CONFORMAL_PATH = "artifacts/metrics/conformal_coverage.csv"
HISTORICAL_RANGES_PATH = "artifacts/metrics/historical_ranges.json"
LEVEL_METRICS_PATH = "artifacts/metrics/test_metrics_by_level.csv"
HORIZON_METRICS_PATH = "artifacts/metrics/test_metrics_by_horizon.csv"
CLEANED_DATA_PATH = "data/processed/cleaned_daily.csv"

_state = {
    "is_loaded": False,
    "split_meta": None,
    "df_forecasts": None,
    "rec_col": None,
    "conformal_df": None,
    "conformal_lookup": {},
    "historical_ranges": {},
    "level_metrics": [],
    "horizon_metrics": [],
    "scenario_engine": None,
    "alert_engine": None,
    "savings_estimator": None,
    "node_metadata": {},
    "all_nodes": [],
    "git_hash": "unknown",
}


def load_all_artifacts():
    """Load all static assets, artifacts, and engines once at service startup."""
    global _state
    if _state["is_loaded"]:
        return

    # 1. Git Hash & Metadata
    try:
        git_hash = subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip()
    except Exception:
        git_hash = "production-frozen"
    _state["git_hash"] = git_hash

    # 2. Split Metadata
    _state["split_meta"] = load_split_metadata(SPLIT_PATH)

    # 3. Reconciled Forecasts
    if os.path.exists(TEST_FORECASTS_PATH):
        df_f = pd.read_csv(TEST_FORECASTS_PATH)
        rec_col = [c for c in df_f.columns if "MinTrace" in c][0]
        _state["df_forecasts"] = df_f
        _state["rec_col"] = rec_col
        _state["all_nodes"] = sorted(df_f["unique_id"].unique().tolist())

    # 4. Conformal Calibration Lookup
    if os.path.exists(CONFORMAL_PATH):
        conf_df = pd.read_csv(CONFORMAL_PATH)
        _state["conformal_df"] = conf_df
        # Lookup map: (node, horizon) -> {q90, q95}
        for _, row in conf_df.iterrows():
            key = (row["node"], int(row["horizon"]))
            _state["conformal_lookup"][key] = {
                "q90": float(row["q90_radius"]),
                "q95": float(row["q95_radius"]),
            }

    # 5. Historical Ranges
    if os.path.exists(HISTORICAL_RANGES_PATH):
        with open(HISTORICAL_RANGES_PATH, "r", encoding="utf-8") as f:
            _state["historical_ranges"] = json.load(f)

    # 6. Test Metrics
    if os.path.exists(LEVEL_METRICS_PATH):
        _state["level_metrics"] = pd.read_csv(LEVEL_METRICS_PATH).to_dict(orient="records")
    if os.path.exists(HORIZON_METRICS_PATH):
        _state["horizon_metrics"] = pd.read_csv(HORIZON_METRICS_PATH).to_dict(orient="records")

    # 7. Engines
    _state["scenario_engine"] = ScenarioEngine()
    _state["alert_engine"] = StressAlertEngine()
    _state["savings_estimator"] = SavingsEstimator()

    # 8. Node Tree Metadata
    nodes_meta = []
    # National
    nodes_meta.append({
        "node_id": "India",
        "name": "India (National Grid)",
        "level": "Country",
        "parent": None,
        "children": [f"India/{r}" for r in REGIONS],
        "is_real": True,
        "historical_range": _state["historical_ranges"].get("India"),
    })
    # Regions
    for r in REGIONS:
        reg_id = f"India/{r}"
        children = _state["scenario_engine"].region_children.get(reg_id, [])
        nodes_meta.append({
            "node_id": reg_id,
            "name": f"{r} (Regional Load Despatch Centre)",
            "level": "Region",
            "parent": "India",
            "children": children,
            "is_real": True,
            "historical_range": _state["historical_ranges"].get(reg_id),
        })
    # States & Bottom leaves
    for b in _state["scenario_engine"].bottom_uids:
        parts = b.split("/")
        reg_parent = f"India/{parts[1]}"
        state_name = parts[2]
        is_real = not state_name.startswith("Other_")
        nodes_meta.append({
            "node_id": b,
            "name": state_name,
            "level": "State",
            "parent": reg_parent,
            "children": [],
            "is_real": is_real,
            "historical_range": _state["historical_ranges"].get(b),
        })

    _state["node_metadata"] = {m["node_id"]: m for m in nodes_meta}
    _state["is_loaded"] = True


def get_meta_info() -> Dict[str, Any]:
    load_all_artifacts()
    import lightgbm
    import hierarchicalforecast
    import sklearn
    import fastapi

    split = _state["split_meta"]
    # Load drift status if available
    drift_status = None
    staleness_warning = None
    retraining_instructions = None
    drift_path = "artifacts/metrics/drift_status.json"
    if os.path.exists(drift_path):
        try:
            with open(drift_path, "r", encoding="utf-8") as f:
                drift_status = json.load(f)
                staleness_warning = drift_status.get("staleness_warning")
                retraining_instructions = drift_status.get("retraining_instructions")
        except Exception:
            pass

    return {
        "model_version": "v2.0-DirectLGBM-MinT-Shrink",
        "data_source": "GRID-INDIA (POSOCO) Daily Energy Reports (2013-03-31 to 2026-09-12)",
        "reliable_data_start": split["reliable_period_start"],
        "reliable_data_end": split["reliable_period_end"],
        "total_reliable_rows": split["total_reliable_rows"],
        "train_full_period": split["train_full"],
        "validation_block": split["val"],
        "test_holdout_period": split["test"],
        "library_versions": {
            "fastapi": fastapi.__version__,
            "lightgbm": lightgbm.__version__,
            "hierarchicalforecast": hierarchicalforecast.__version__,
            "scikit_learn": sklearn.__version__,
        },
        "git_hash": _state["git_hash"],
        "drift_status": drift_status,
        "staleness_warning": staleness_warning,
        "retraining_instructions": retraining_instructions,
    }


def get_all_nodes() -> List[Dict[str, Any]]:
    load_all_artifacts()
    return list(_state["node_metadata"].values())


def get_forecast_for_node(
    node_id: str = "India",
    horizon_days: int = 14,
    include_intervals: bool = True,
) -> Dict[str, Any]:
    load_all_artifacts()
    df_f = _state["df_forecasts"]
    rec_col = _state["rec_col"]

    sub = df_f[df_f["unique_id"] == node_id]
    if len(sub) == 0:
        raise KeyError(f"Node '{node_id}' not found in hierarchy.")

    # Get latest origin date in test set
    latest_date = sub["ds"].max()
    date_sub = sub[sub["ds"] == latest_date].sort_values("horizon")
    if len(date_sub) == 0:
        date_sub = sub[sub["horizon"] <= horizon_days].head(horizon_days)

    points = []
    for _, row in date_sub.iterrows():
        h = int(row["horizon"])
        if h > horizon_days:
            continue

        base_val = round(float(row["y_hat"]), 2)
        rec_val = round(float(row[rec_col]), 2)
        act_val = round(float(row["y"]), 2) if not pd.isna(row["y"]) else None

        q90_r = None
        q95_r = None
        if include_intervals:
            rad_info = _state["conformal_lookup"].get((node_id, h))
            if rad_info is not None:
                q90_r = round(rad_info["q90"], 2)
                q95_r = round(rad_info["q95"], 2)

        points.append({
            "ds": str(row["ds"]),
            "horizon": h,
            "actual": act_val,
            "base_forecast": base_val,
            "reconciled_forecast": rec_val,
            "q90_lower": round(rec_val - q90_r, 2) if q90_r is not None else None,
            "q90_upper": round(rec_val + q90_r, 2) if q90_r is not None else None,
            "q95_lower": round(rec_val - q95_r, 2) if q95_r is not None else None,
            "q95_upper": round(rec_val + q95_r, 2) if q95_r is not None else None,
        })

    return {
        "node_id": node_id,
        "horizon_days": min(horizon_days, len(points)),
        "unit": "MU/day",
        "series": points,
    }


def get_hierarchy_snapshot(
    date: Optional[str] = None,
    horizon: int = 1,
    mode: str = "reconciled",
) -> Dict[str, Any]:
    load_all_artifacts()
    df_f = _state["df_forecasts"]
    rec_col = _state["rec_col"]

    sub = df_f[df_f["horizon"] == horizon]
    if date is None:
        target_date = sub["ds"].max()
    else:
        target_date = date

    snapshot = sub[sub["ds"] == target_date]
    if len(snapshot) == 0:
        raise KeyError(f"No forecast data for date '{target_date}' at horizon {horizon}.")

    # Choose column based on mode
    if mode == "actual":
        val_col = "y"
    elif mode == "unreconciled":
        val_col = "y_hat"
    else:
        val_col = rec_col

    val_map = snapshot.set_index("unique_id")[val_col].to_dict()

    nat_val = round(float(val_map.get("India", 0.0)), 2)
    regions_map = {}
    for r in REGIONS:
        r_id = f"India/{r}"
        regions_map[r] = {
            "node_id": r_id,
            "name": f"{r} Regional RLDC",
            "value": round(float(val_map.get(r_id, 0.0)), 2),
            "unit": "MU/day",
            "children": _state["scenario_engine"].region_children.get(r_id, []),
        }

    bottom_map = {}
    for b in _state["scenario_engine"].bottom_uids:
        bottom_map[b] = {
            "node_id": b,
            "name": b.split("/")[-1],
            "value": round(float(val_map.get(b, 0.0)), 2),
            "unit": "MU/day",
            "children": [],
        }

    # Compute coherence gap in MU (Nat vs sum of regions)
    reg_sum = sum(rm["value"] for rm in regions_map.values())
    coherence_gap = round(abs(nat_val - reg_sum), 3)
    is_coherent = coherence_gap < 1.0

    return {
        "date": target_date,
        "horizon": horizon,
        "mode": mode,
        "unit": "MU/day",
        "national": {
            "node_id": "India",
            "name": "India (National Grid)",
            "value": nat_val,
            "unit": "MU/day",
            "children": [f"India/{r}" for r in REGIONS],
        },
        "regions": regions_map,
        "bottom_level": bottom_map,
        "coherence_gap_mu": coherence_gap,
        "is_coherent": is_coherent,
    }


def simulate_scenario(
    target_node: str,
    delta: Optional[float] = None,
    pct_change: Optional[float] = None,
    new_value: Optional[float] = None,
    pinned_nodes: Optional[List[str]] = None,
    date: Optional[str] = None,
    horizon: int = 1,
) -> Dict[str, Any]:
    load_all_artifacts()
    engine: ScenarioEngine = _state["scenario_engine"]
    return engine.simulate(
        target_node=target_node,
        delta=delta,
        pct_change=pct_change,
        new_value=new_value,
        pinned_nodes=pinned_nodes,
        date=date,
        horizon=horizon,
    )


def get_stress_alerts(
    date: Optional[str] = None,
    region: Optional[str] = None,
    month: Optional[int] = None,
) -> Dict[str, Any]:
    load_all_artifacts()
    alert_engine: StressAlertEngine = _state["alert_engine"]

    if date is not None:
        eval_month = pd.Timestamp(date).month
    elif month is not None:
        eval_month = int(month)
    else:
        eval_month = 7

    # Load latest forecast demand for regions
    snap = get_hierarchy_snapshot(date=date, horizon=1, mode="reconciled")
    demands = {"India": snap["national"]["value"]}
    for r, r_meta in snap["regions"].items():
        demands[r] = r_meta["value"]

    if region is not None:
        alerts = alert_engine.evaluate_region(region, demands.get(region, 1000.0), month=eval_month)
    else:
        alerts = alert_engine.evaluate_scenario(demands, month=eval_month)

    return {
        "total_alerts": len(alerts),
        "date": date or snap["date"],
        "month": eval_month,
        "alerts": alerts,
        "caveat": alert_engine.caveat,
    }


def get_backtest_data(
    node_id: str = "India",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    horizon: int = 1,
) -> Dict[str, Any]:
    load_all_artifacts()
    df_f = _state["df_forecasts"]
    rec_col = _state["rec_col"]

    sub = df_f[(df_f["unique_id"] == node_id) & (df_f["horizon"] == horizon)].copy()
    if len(sub) == 0:
        raise KeyError(f"Node '{node_id}' not found.")

    sub = sub.sort_values("ds")
    if start_date:
        sub = sub[sub["ds"] >= start_date]
    if end_date:
        sub = sub[sub["ds"] <= end_date]

    points = []
    y_true = sub["y"].values
    y_base = sub["y_hat"].values
    y_rec = sub[rec_col].values

    for _, row in sub.iterrows():
        act = round(float(row["y"]), 2)
        base = round(float(row["y_hat"]), 2)
        rec = round(float(row[rec_col]), 2)
        err_b = round(act - base, 2)
        err_r = round(act - rec, 2)
        points.append({
            "ds": str(row["ds"]),
            "actual": act,
            "unreconciled": base,
            "reconciled": rec,
            "error_unreconciled": err_b,
            "error_reconciled": err_r,
            "abs_error_unreconciled": round(abs(err_b), 2),
            "abs_error_reconciled": round(abs(err_r), 2),
        })

    mae_base = float(np.mean(np.abs(y_true - y_base)))
    mae_rec = float(np.mean(np.abs(y_true - y_rec)))
    rmse_base = float(np.sqrt(np.mean((y_true - y_base) ** 2)))
    rmse_rec = float(np.sqrt(np.mean((y_true - y_rec) ** 2)))
    wape_base = float(np.sum(np.abs(y_true - y_base)) / np.sum(np.abs(y_true)) * 100)
    wape_rec = float(np.sum(np.abs(y_true - y_rec)) / np.sum(np.abs(y_true)) * 100)

    return {
        "node_id": node_id,
        "horizon": horizon,
        "start_date": str(sub["ds"].min()),
        "end_date": str(sub["ds"].max()),
        "sample_days": len(sub),
        "metrics_summary": {
            "unreconciled": {"mae": round(mae_base, 2), "rmse": round(rmse_base, 2), "wape": round(wape_base, 2)},
            "reconciled": {"mae": round(mae_rec, 2), "rmse": round(rmse_rec, 2), "wape": round(wape_rec, 2)},
        },
        "series": points,
    }


def get_metrics_data(level: Optional[str] = None, horizon: Optional[int] = None) -> Dict[str, Any]:
    load_all_artifacts()
    lvl = _state["level_metrics"]
    hor = _state["horizon_metrics"]
    conf = _state["conformal_df"].to_dict(orient="records") if _state["conformal_df"] is not None else []

    if level:
        lvl = [row for row in lvl if row.get("level") == level]
    if horizon:
        hor = [row for row in hor if row.get("horizon") == horizon]

    return {
        "test_metrics_by_level": lvl,
        "test_metrics_by_horizon": hor,
        "conformal_coverage": conf,
    }


def get_savings_data(
    baseline: str = "unreconciled",
    price_under: float = 6.50,
    price_over: float = 3.50,
    horizon: int = 1,
) -> Dict[str, Any]:
    load_all_artifacts()
    estimator: SavingsEstimator = _state["savings_estimator"]
    return estimator.calculate_savings(
        baseline=baseline,
        price_under=price_under,
        price_over=price_over,
        horizon=horizon,
    )
