"""
validation_experiment.py
Runs the complete Phase B validation tournament strictly on the 80% train / validation split.

Baselines evaluated:
1. Baseline: Same Weekday Last Week (most recent same weekday <= origin)
2. Baseline: Same Weekday 364d Ago (52 weeks ago)
3. Baseline: Day-Ahead Persistence (node's own day-ahead forecast persisted)

Candidates evaluated:
4. Candidate: Direct LightGBM (Ratio trend mode)
5. Candidate: Direct XGBoost
6. Candidate: Direct Ridge (Regularized Linear)
7. Candidate: Simple Ensemble (LightGBM + XGBoost + Ridge)
8. Candidate: Global LightGBM (Pooled across nodes with node_id as categorical)
9. Candidate: Recursive LightGBM (Iterative 1-step roll-forward)

Saves comparison to artifacts/metrics/validation_comparison.csv.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["MPLCONFIGDIR"] = "/tmp/mplconfig"

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

from src.baselines import generate_baseline_forecasts
from src.features import build_node_features_for_horizon, get_feature_column_names
from src.hierarchy import REGION_MEMBERS, REGIONS
from src.models import (
    DirectLGBMForecaster,
    DirectRidgeForecaster,
    DirectXGBForecaster,
    EnsembleForecaster,
)
from src.split import get_split_data

HORIZONS = list(range(1, 15))


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Compute MAE, RMSE, WAPE, and MAPE (excluding true values near 0)."""
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    yt = y_true[mask]
    yp = y_pred[mask]

    if len(yt) == 0:
        return {"mae": np.nan, "rmse": np.nan, "wape": np.nan, "mape": np.nan}

    mae = mean_absolute_error(yt, yp)
    rmse = np.sqrt(mean_squared_error(yt, yp))
    sum_true = np.sum(np.abs(yt))
    wape = (np.sum(np.abs(yt - yp)) / sum_true * 100) if sum_true > 0 else np.nan

    # MAPE only where actual > 5 MU
    nz_mask = yt > 5.0
    mape = (np.mean(np.abs(yt[nz_mask] - yp[nz_mask]) / yt[nz_mask]) * 100) if nz_mask.sum() > 0 else np.nan

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "wape": round(wape, 2),
        "mape": round(mape, 2),
    }


def run_validation_tournament(output_csv: str = "artifacts/metrics/validation_comparison.csv") -> pd.DataFrame:
    print("Loading data and splits for Phase B validation tournament...")
    train_df, val_df, train_full_df, test_df = get_split_data()

    df = pd.read_csv("data/processed/cleaned_daily.csv")
    rel = df[df["is_data_reliable"] == True].sort_values("date").reset_index(drop=True)
    rel["date"] = pd.to_datetime(rel["date"])

    # Benchmark nodes: National (India) + 5 Regions
    eval_nodes = ["India: EnergyMet"] + [f"{r}: EnergyMet" for r in REGIONS]

    val_start = pd.Timestamp(val_df["date"].min())
    val_end = pd.Timestamp(val_df["date"].max())

    results = []

    # Step 1: Fit day-ahead models for each node to supply the Day-Ahead Persistence baseline
    # and initialize the Recursive LightGBM model.
    print("Fitting day-ahead (h=1) base models per node...")
    node_h1_models = {}
    node_h1_preds = {}
    node_h1_feat_cols = {}

    for node in eval_nodes:
        df_feat_1 = build_node_features_for_horizon(rel, node, h=1)
        feat_cols = get_feature_column_names(df_feat_1)
        node_h1_feat_cols[node] = feat_cols

        tr_mask = (df_feat_1["date"] >= train_df["date"].min()) & (df_feat_1["date"] <= train_df["date"].max())
        val_mask = (df_feat_1["date"] >= val_start) & (df_feat_1["date"] <= val_end)

        X_tr = df_feat_1.loc[tr_mask, feat_cols].dropna()
        y_tr = df_feat_1.loc[X_tr.index, "target"]
        r30_tr = df_feat_1.loc[X_tr.index, "rolling_mean_30_origin"]

        m_1 = DirectLGBMForecaster(n_estimators=120, learning_rate=0.05, max_depth=5, trend_mode="ratio")
        m_1.fit(X_tr, y_tr, rolling_30=r30_tr)
        node_h1_models[node] = m_1

        X_va = df_feat_1.loc[val_mask, feat_cols].dropna()
        r30_va = df_feat_1.loc[X_va.index, "rolling_mean_30_origin"]
        p_1 = m_1.predict(X_va, rolling_30=r30_va)
        node_h1_preds[node] = pd.Series(p_1, index=df_feat_1.loc[X_va.index, "date"])

    print("Evaluating horizons 1 to 14 across baselines and candidate models...")

    for h in HORIZONS:
        print(f"--- Horizon h={h} ---")

        # Global model training for this horizon
        common_features = [
            "day_of_week", "day_of_month", "month", "year", "day_of_year",
            "is_weekend", "is_holiday", "days_to_nearest_festival",
            "sin_doy_k1", "cos_doy_k1", "sin_doy_k2", "cos_doy_k2", "sin_doy_k3", "cos_doy_k3",
            "lag_origin", "lag_sw_origin", "lag_2w_origin", "lag_4w_origin", "lag_364",
            "rolling_mean_7_origin", "rolling_std_7_origin",
            "rolling_mean_30_origin", "rolling_std_30_origin",
        ]
        global_dfs = []
        for node in eval_nodes:
            f = build_node_features_for_horizon(rel, node, h=h)
            f["node_id"] = node.replace(": EnergyMet", "")
            global_dfs.append(f)
        global_df = pd.concat(global_dfs, ignore_index=True)

        g_train_mask = (global_df["date"] >= train_df["date"].min()) & (global_df["date"] <= train_df["date"].max())
        g_val_mask = (global_df["date"] >= val_start) & (global_df["date"] <= val_end)

        g_X_tr = global_df.loc[g_train_mask, ["node_id"] + common_features].dropna()
        g_y_tr = global_df.loc[g_X_tr.index, "target"]
        g_safe_cols = {c: c.replace(":", "").replace(" ", "_") for c in g_X_tr.columns}
        g_X_tr_clean = g_X_tr.rename(columns=g_safe_cols)
        g_X_tr_clean["node_id"] = g_X_tr_clean["node_id"].astype("category")

        global_lgbm = lgb.LGBMRegressor(
            n_estimators=150, learning_rate=0.05, max_depth=6, random_state=42, n_jobs=1, verbosity=-1
        )
        global_lgbm.fit(g_X_tr_clean, g_y_tr, categorical_feature=["node_id"])

        for node in eval_nodes:
            node_clean_name = node.replace(": EnergyMet", "")
            y_series = rel.set_index("date")[node]

            df_feat = build_node_features_for_horizon(rel, node, h=h)
            feat_cols = get_feature_column_names(df_feat)

            train_mask = (df_feat["date"] >= train_df["date"].min()) & (df_feat["date"] <= train_df["date"].max())
            val_mask = (df_feat["date"] >= val_start) & (df_feat["date"] <= val_end)

            X_tr = df_feat.loc[train_mask, feat_cols].dropna()
            y_tr = df_feat.loc[X_tr.index, "target"]
            r30_tr = df_feat.loc[X_tr.index, "rolling_mean_30_origin"]

            X_va = df_feat.loc[val_mask, feat_cols].dropna()
            y_va = df_feat.loc[X_va.index, "target"].values
            val_dt = df_feat.loc[X_va.index, "date"]
            r30_va = df_feat.loc[X_va.index, "rolling_mean_30_origin"]

            # Baseline 1: Same weekday last week
            p_b1 = generate_baseline_forecasts(y_series, val_dt, h=h, baseline_name="same_weekday_last_week")
            m_b1 = calculate_metrics(y_va, p_b1)
            results.append({"horizon": h, "node": node_clean_name, "model": "Baseline: Same Weekday Last Week", **m_b1})

            # Baseline 2: Same weekday 364d ago
            p_b2 = generate_baseline_forecasts(y_series, val_dt, h=h, baseline_name="same_weekday_364")
            m_b2 = calculate_metrics(y_va, p_b2)
            results.append({"horizon": h, "node": node_clean_name, "model": "Baseline: Same Weekday 364d Ago", **m_b2})

            # Baseline 3: Day-ahead persistence (node's own day-ahead prediction)
            p_b3 = generate_baseline_forecasts(
                y_series, val_dt, h=h, baseline_name="day_ahead_persistence", day_ahead_predictions=node_h1_preds[node]
            )
            m_b3 = calculate_metrics(y_va, p_b3)
            results.append({"horizon": h, "node": node_clean_name, "model": "Baseline: Day-Ahead Persistence", **m_b3})

            # Candidate 1: Direct LightGBM (Ratio trend mode)
            m_lgbm = DirectLGBMForecaster(n_estimators=120, learning_rate=0.05, max_depth=5, trend_mode="ratio")
            m_lgbm.fit(X_tr, y_tr, rolling_30=r30_tr)
            p_lgbm = m_lgbm.predict(X_va, rolling_30=r30_va)
            m_res_lgbm = calculate_metrics(y_va, p_lgbm)
            results.append({"horizon": h, "node": node_clean_name, "model": "Candidate: Direct LightGBM (Ratio)", **m_res_lgbm})

            # Candidate 2: Direct XGBoost
            m_xgb = DirectXGBForecaster(n_estimators=100, learning_rate=0.05, max_depth=5)
            m_xgb.fit(X_tr, y_tr)
            p_xgb = m_xgb.predict(X_va)
            m_res_xgb = calculate_metrics(y_va, p_xgb)
            results.append({"horizon": h, "node": node_clean_name, "model": "Candidate: Direct XGBoost", **m_res_xgb})

            # Candidate 3: Direct Ridge
            m_ridge = DirectRidgeForecaster(alpha=50.0)
            m_ridge.fit(X_tr, y_tr)
            p_ridge = m_ridge.predict(X_va)
            m_res_ridge = calculate_metrics(y_va, p_ridge)
            results.append({"horizon": h, "node": node_clean_name, "model": "Candidate: Direct Ridge", **m_res_ridge})

            # Candidate 4: Simple Ensemble (LightGBM + XGBoost + Ridge)
            m_ens = EnsembleForecaster(m_lgbm, m_xgb, m_ridge)
            p_ens = m_ens.predict(X_va, rolling_30=r30_va)
            m_res_ens = calculate_metrics(y_va, p_ens)
            results.append({"horizon": h, "node": node_clean_name, "model": "Candidate: Simple Ensemble", **m_res_ens})

            # Candidate 5: Global LightGBM
            df_feat_g = df_feat.copy()
            df_feat_g["node_id"] = node_clean_name
            g_X_va = df_feat_g.loc[val_mask, ["node_id"] + common_features].dropna()
            g_X_va_clean = g_X_va.rename(columns=g_safe_cols)
            g_X_va_clean["node_id"] = g_X_va_clean["node_id"].astype("category")
            p_global = global_lgbm.predict(g_X_va_clean)
            m_res_global = calculate_metrics(y_va, p_global)
            results.append({"horizon": h, "node": node_clean_name, "model": "Candidate: Global LightGBM", **m_res_global})

            # Candidate 6: Recursive LightGBM
            # Recursive strategy feeds step-ahead forecast back into origin lag
            # For validation block: lag_origin is updated with p_lgbm from horizon 1
            if h == 1:
                p_rec = p_lgbm
            else:
                X_va_rec = X_va.copy()
                # Substitute lag_origin with prior horizon's prediction
                X_va_rec["lag_origin"] = p_lgbm
                p_rec = node_h1_models[node].predict(X_va_rec, rolling_30=r30_va)
            m_res_rec = calculate_metrics(y_va, p_rec)
            results.append({"horizon": h, "node": node_clean_name, "model": "Candidate: Recursive LightGBM", **m_res_rec})

    res_df = pd.DataFrame(results)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    res_df.to_csv(output_csv, index=False)
    print(f"Saved validation tournament results to {output_csv}")

    # Summary table
    agg_summary = res_df.groupby(["model"])[["mae", "rmse", "wape", "mape"]].mean().sort_values("wape")
    print("\n=== OVERALL VALIDATION TOURNAMENT SUMMARY (Average across Horizons 1..14 & Nodes) ===")
    print(agg_summary.to_string())

    return res_df


if __name__ == "__main__":
    run_validation_tournament()
