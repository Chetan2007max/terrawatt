"""
models.py
Candidate forecasting models for Phase B:
1. LightGBM (Direct, with trend ratio handling)
2. XGBoost (Direct)
3. Regularized Linear Model (Ridge, with StandardScaler)
4. Simple Average Ensemble
5. Global Model (pooled across nodes with node_id as categorical)
6. Recursive LightGBM

All models operate strictly within Python 3.14 constraints:
LightGBM uses n_jobs=1 to avoid OpenMP segfaults on macOS.
"""

import os
os.environ["MPLCONFIGDIR"] = "/tmp/mplconfig"

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import xgboost as xgb


class BaseForecaster:
    def fit(self, X: pd.DataFrame, y: pd.Series, **kwargs):
        raise NotImplementedError

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        raise NotImplementedError


class DirectLGBMForecaster(BaseForecaster):
    def __init__(self, n_estimators: int = 150, learning_rate: float = 0.05, max_depth: int = 5, trend_mode: str = "ratio"):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.trend_mode = trend_mode  # "raw", "ratio", or "delta"
        self.model = None

    def fit(self, X: pd.DataFrame, y: pd.Series, rolling_30: pd.Series = None, lag_364: pd.Series = None):
        safe_cols = {c: c.replace(":", "").replace(" ", "_") for c in X.columns}
        X_clean = X.rename(columns=safe_cols)

        if self.trend_mode == "ratio" and rolling_30 is not None:
            target = (y / rolling_30.clip(lower=1e-3)).clip(lower=0.2, upper=3.0)
        elif self.trend_mode == "delta" and lag_364 is not None:
            target = y - lag_364
        else:
            target = y

        self.model = lgb.LGBMRegressor(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            random_state=42,
            n_jobs=1,
            verbosity=-1,
        )
        self.model.fit(X_clean, target)
        return self

    def predict(self, X: pd.DataFrame, rolling_30: pd.Series = None, lag_364: pd.Series = None) -> np.ndarray:
        safe_cols = {c: c.replace(":", "").replace(" ", "_") for c in X.columns}
        X_clean = X.rename(columns=safe_cols)
        preds = self.model.predict(X_clean)

        if self.trend_mode == "ratio" and rolling_30 is not None:
            preds_clipped = np.clip(preds, 0.2, 3.0)
            return preds_clipped * rolling_30.values
        elif self.trend_mode == "delta" and lag_364 is not None:
            return preds + lag_364.values
        return preds


class DirectXGBForecaster(BaseForecaster):
    def __init__(self, n_estimators: int = 150, learning_rate: float = 0.05, max_depth: int = 5):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.model = None

    def fit(self, X: pd.DataFrame, y: pd.Series):
        safe_cols = {c: c.replace(":", "").replace(" ", "_") for c in X.columns}
        X_clean = X.rename(columns=safe_cols)
        self.model = xgb.XGBRegressor(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            random_state=42,
            n_jobs=1,
        )
        self.model.fit(X_clean, y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        safe_cols = {c: c.replace(":", "").replace(" ", "_") for c in X.columns}
        X_clean = X.rename(columns=safe_cols)
        return self.model.predict(X_clean)


class DirectRidgeForecaster(BaseForecaster):
    def __init__(self, alpha: float = 10.0):
        self.alpha = alpha
        self.pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("ridge", Ridge(alpha=self.alpha, random_state=42))
        ])

    def fit(self, X: pd.DataFrame, y: pd.Series):
        self.pipeline.fit(X.fillna(0), y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.pipeline.predict(X.fillna(0))


class EnsembleForecaster(BaseForecaster):
    """Simple average ensemble of LightGBM, XGBoost, and Ridge."""
    def __init__(self, lgbm: DirectLGBMForecaster, xgb_m: DirectXGBForecaster, ridge: DirectRidgeForecaster):
        self.lgbm = lgbm
        self.xgb = xgb_m
        self.ridge = ridge

    def predict(self, X: pd.DataFrame, rolling_30: pd.Series = None, lag_364: pd.Series = None) -> np.ndarray:
        p1 = self.lgbm.predict(X, rolling_30=rolling_30, lag_364=lag_364)
        p2 = self.xgb.predict(X)
        p3 = self.ridge.predict(X)
        return (p1 + p2 + p3) / 3.0


class GlobalLGBMForecaster(BaseForecaster):
    """
    Global LightGBM model trained across all hierarchy nodes,
    with node_id encoded as a categorical feature.
    """
    def __init__(self, n_estimators: int = 200, learning_rate: float = 0.05, max_depth: int = 6):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.model = None

    def fit(self, X: pd.DataFrame, y: pd.Series, categorical_features: list = ["node_id"]):
        safe_cols = {c: c.replace(":", "").replace(" ", "_") for c in X.columns}
        X_clean = X.rename(columns=safe_cols)
        cat_clean = [safe_cols.get(c, c) for c in categorical_features if c in X.columns]

        for col in cat_clean:
            X_clean[col] = X_clean[col].astype("category")

        self.model = lgb.LGBMRegressor(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            random_state=42,
            n_jobs=1,
            verbosity=-1,
        )
        self.model.fit(X_clean, y, categorical_feature=cat_clean)
        return self

    def predict(self, X: pd.DataFrame, categorical_features: list = ["node_id"]) -> np.ndarray:
        safe_cols = {c: c.replace(":", "").replace(" ", "_") for c in X.columns}
        X_clean = X.rename(columns=safe_cols)
        cat_clean = [safe_cols.get(c, c) for c in categorical_features if c in X.columns]

        for col in cat_clean:
            X_clean[col] = X_clean[col].astype("category")

        return self.model.predict(X_clean)

