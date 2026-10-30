"""
scenario.py
Phase C: What-If Scenario Engine for TerraWatt v2.

Allows simulating demand shocks at any node in the 51-node hierarchy (National,
Regional, or State/Leaf) and redistributes the shock across the entire network
so that every parent equals the sum of its children exactly (within 1e-6).

Supports two allocation methods:
1. Proportional: Preserves the baseline forecast shares.
2. Covariance-Aware: A constrained least-squares adjustment (the edited node and
   any pinned nodes held fixed, while remaining nodes move as little as possible,
   weighted inversely by their historical forecast error variance).

Mandatory Note:
"This is a statistical redistribution, not a power-flow simulation."
"""

import json
import os
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy.linalg import lstsq

from src.hierarchy import REGION_MEMBERS, REGIONS, build_summing_matrix
from src.alerts import StressAlertEngine

HISTORICAL_RANGES_PATH = "artifacts/metrics/historical_ranges.json"
RESIDUAL_VARIANCES_PATH = "artifacts/metrics/node_residual_variances.json"
TEST_FORECASTS_PATH = "artifacts/metrics/reconciled_test_forecasts.csv"
CLEANED_DATA_PATH = "data/processed/cleaned_daily.csv"
DISCLAIMER_TEXT = "This is a statistical redistribution, not a power-flow simulation."


class ScenarioEngine:
    def __init__(
        self,
        cleaned_data_path: str = CLEANED_DATA_PATH,
        ranges_path: str = HISTORICAL_RANGES_PATH,
        variances_path: str = RESIDUAL_VARIANCES_PATH,
        forecasts_path: str = TEST_FORECASTS_PATH,
    ):
        self.cleaned_data_path = cleaned_data_path
        self.ranges_path = ranges_path
        self.variances_path = variances_path
        self.forecasts_path = forecasts_path

        # 1. Build hierarchy structures
        df_clean = pd.read_csv(self.cleaned_data_path)
        rel = df_clean[df_clean["is_data_reliable"] == True].sort_values("date").reset_index(drop=True)
        for r in REGIONS:
            rel[f"Other_{r}"] = rel[f"{r}: EnergyMet"] - rel[REGION_MEMBERS[r]].sum(axis=1)

        Y_df, S_df, self.tags = build_summing_matrix(rel)
        self.uids: List[str] = S_df["unique_id"].tolist()
        self.bottom_uids: List[str] = [c for c in S_df.columns if c != "unique_id"]
        self.S: np.ndarray = S_df.drop(columns=["unique_id"]).values.astype(float)  # (51, 45)

        self.uid_to_idx: Dict[str, int] = {uid: i for i, uid in enumerate(self.uids)}
        self.bottom_to_idx: Dict[str, int] = {b: i for i, b in enumerate(self.bottom_uids)}

        # Map each region to its bottom children
        self.region_children: Dict[str, List[str]] = {}
        for r in REGIONS:
            prefix = f"India/{r}/"
            self.region_children[f"India/{r}"] = [
                b for b in self.bottom_uids if b.startswith(prefix)
            ]

        # 2. Load historical ranges and variances
        self.historical_ranges = self._load_or_compute_ranges(rel)
        self.residual_variances = self._load_or_compute_variances()

        # Weight matrix for covariance-aware constrained least squares:
        # H = S.T @ W @ S where W = diag(1 / sigma^2)
        stds = np.array([self.residual_variances.get(uid, 10.0) for uid in self.uids], dtype=float)
        stds = np.maximum(stds, 0.1)
        self.W = np.diag(1.0 / (stds ** 2))
        self.H = self.S.T @ self.W @ self.S

        # 3. Stress alert engine
        self.alert_engine = StressAlertEngine()

        # 4. Load forecasts cache if available
        self._forecasts_df: Optional[pd.DataFrame] = None
        if os.path.exists(self.forecasts_path):
            self._forecasts_df = pd.read_csv(self.forecasts_path)
            self._rec_col = [c for c in self._forecasts_df.columns if "MinTrace" in c][0]

    def _load_or_compute_ranges(self, rel: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        if os.path.exists(self.ranges_path):
            with open(self.ranges_path, "r", encoding="utf-8") as f:
                return json.load(f)

        def uid_to_col(uid: str) -> str:
            parts = uid.split("/")
            if len(parts) == 1:
                return "India: EnergyMet"
            elif len(parts) == 2:
                return f"{parts[1]}: EnergyMet"
            else:
                state_name = parts[2]
                return state_name if state_name.startswith("Other_") else f"{state_name}: EnergyMet"

        ranges = {}
        for uid in self.uids:
            col = uid_to_col(uid)
            s = rel[col].dropna()
            pos = s[s > 0]
            ranges[uid] = {
                "min": round(float(s.min()), 2),
                "max": round(float(s.max()), 2),
                "p01": round(float(pos.quantile(0.01)), 2) if len(pos) > 0 else 0.0,
                "p05": round(float(pos.quantile(0.05)), 2) if len(pos) > 0 else 0.0,
                "p50": round(float(pos.quantile(0.50)), 2) if len(pos) > 0 else 0.0,
                "p95": round(float(pos.quantile(0.95)), 2) if len(pos) > 0 else 0.0,
                "p99": round(float(pos.quantile(0.99)), 2) if len(pos) > 0 else 0.0,
            }
        os.makedirs(os.path.dirname(self.ranges_path), exist_ok=True)
        with open(self.ranges_path, "w", encoding="utf-8") as f:
            json.dump(ranges, f, indent=2)
        return ranges

    def _load_or_compute_variances(self) -> Dict[str, float]:
        if os.path.exists(self.variances_path):
            with open(self.variances_path, "r", encoding="utf-8") as f:
                return json.load(f)

        variances = {}
        if os.path.exists(self.forecasts_path):
            df = pd.read_csv(self.forecasts_path)
            rec_c = [c for c in df.columns if "MinTrace" in c][0]
            h1 = df[df["horizon"] == 1]
            for uid, grp in h1.groupby("unique_id"):
                std = float((grp["y"] - grp[rec_c]).std())
                variances[uid] = max(round(std, 3), 0.1)

        for uid in self.uids:
            if uid not in variances:
                variances[uid] = 10.0

        os.makedirs(os.path.dirname(self.variances_path), exist_ok=True)
        with open(self.variances_path, "w", encoding="utf-8") as f:
            json.dump(variances, f, indent=2)
        return variances

    def get_available_dates(self) -> List[str]:
        """Return list of distinct forecast dates available in holdout test set."""
        if self._forecasts_df is not None:
            return sorted(self._forecasts_df["ds"].unique().tolist())
        return []

    def get_base_forecast(self, date: Optional[str] = None, horizon: int = 1) -> Dict[str, float]:
        """Fetch the reconciled baseline forecast vector across all 51 nodes."""
        if self._forecasts_df is None:
            raise RuntimeError("Forecasts artifact not available.")

        sub = self._forecasts_df[self._forecasts_df["horizon"] == horizon]
        if date is None:
            target_date = sub["ds"].max()
        else:
            target_date = date

        date_sub = sub[sub["ds"] == target_date]
        if len(date_sub) == 0:
            raise ValueError(f"Date {target_date} not found for horizon {horizon}.")

        vec_map = date_sub.set_index("unique_id")[self._rec_col].to_dict()
        return {uid: float(vec_map[uid]) for uid in self.uids if uid in vec_map}

    def check_coherence(self, hierarchy_dict: Dict[str, float]) -> Tuple[bool, float]:
        """Assert every parent equals the sum of its children to within 1e-6."""
        max_diff = 0.0

        # 1. State to Region coherence
        for r in REGIONS:
            reg_uid = f"India/{r}"
            reg_val = hierarchy_dict.get(reg_uid, 0.0)
            children = self.region_children[reg_uid]
            child_sum = sum(hierarchy_dict.get(c, 0.0) for c in children)
            diff = abs(reg_val - child_sum)
            if diff > max_diff:
                max_diff = diff

        # 2. Region to National coherence
        nat_val = hierarchy_dict.get("India", 0.0)
        reg_sum = sum(hierarchy_dict.get(f"India/{r}", 0.0) for r in REGIONS)
        diff_nat = abs(nat_val - reg_sum)
        if diff_nat > max_diff:
            max_diff = diff_nat

        is_coherent = max_diff < 1e-6
        return is_coherent, float(max_diff)

    def check_historical_warnings(self, hierarchy_dict: Dict[str, float]) -> List[str]:
        """Warn when scenario value is outside historical range [p01, p99] or min/max."""
        warnings = []
        for uid, val in hierarchy_dict.items():
            if uid in self.historical_ranges:
                r = self.historical_ranges[uid]
                p99 = r.get("p99", r["max"])
                p01 = r.get("p01", r["min"])
                if val > p99:
                    warnings.append(
                        f"Scenario demand for {uid} ({val:.1f} MU) exceeds historical 99th percentile ({p99:.1f} MU)."
                    )
                elif val < p01 and val > 0:
                    warnings.append(
                        f"Scenario demand for {uid} ({val:.1f} MU) is below historical 1st percentile ({p01:.1f} MU)."
                    )
                elif val > r["max"]:
                    warnings.append(
                        f"Scenario demand for {uid} ({val:.1f} MU) exceeds all-time recorded maximum ({r['max']:.1f} MU)."
                    )
        return warnings

    def check_below_zero_flags(self, hierarchy_dict: Dict[str, float]) -> List[str]:
        """Flag any real node (excluding synthetic Other_* residual nodes) pushed below zero."""
        flags = []
        for uid, val in hierarchy_dict.items():
            if "Other_" not in uid and val < -1e-6:
                flags.append(
                    f"Real node {uid} pushed below zero: {val:.2f} MU."
                )
        return flags

    def _expand_pinned_bottom(self, pinned_uids: List[str]) -> set:
        """Expand pinned nodes to include all descendant bottom leaves."""
        pinned_bottom = set()
        for p in pinned_uids:
            if p in self.bottom_uids:
                pinned_bottom.add(p)
            elif p in self.region_children:
                pinned_bottom.update(self.region_children[p])
        return pinned_bottom

    def _solve_proportional(
        self,
        y0: np.ndarray,
        target_uid: str,
        new_val: float,
        pinned_uids: List[str],
    ) -> np.ndarray:
        """
        Proportional allocation: keeps forecast shares across unpinned siblings.
        Coherence is strictly maintained via the summing matrix S @ y_bottom.
        """
        target_idx = self.uid_to_idx[target_uid]
        yb = np.array([y0[self.uid_to_idx[b]] for b in self.bottom_uids], dtype=float)
        pinned_set = set(pinned_uids)
        pinned_bottom = self._expand_pinned_bottom(pinned_uids)

        if target_uid in self.bottom_uids:
            # Bottom node edited
            t_bidx = self.bottom_to_idx[target_uid]
            delta = new_val - yb[t_bidx]
            yb[t_bidx] = new_val

            # If parent region or national total is pinned, offset among unpinned peers
            parent_reg = "/".join(target_uid.split("/")[:2])
            if parent_reg in pinned_set:
                peers = [c for c in self.region_children[parent_reg] if c != target_uid and c not in pinned_bottom]
                peer_sum = sum(y0[self.uid_to_idx[c]] for c in peers)
                for c in peers:
                    bidx = self.bottom_to_idx[c]
                    share = (y0[self.uid_to_idx[c]] / peer_sum) if peer_sum > 1e-4 else (1.0 / len(peers))
                    yb[bidx] -= delta * share
            elif "India" in pinned_set:
                peers = [b for b in self.bottom_uids if b != target_uid and b not in pinned_bottom]
                peer_sum = sum(y0[self.uid_to_idx[b]] for b in peers)
                for b in peers:
                    bidx = self.bottom_to_idx[b]
                    share = (y0[self.uid_to_idx[b]] / peer_sum) if peer_sum > 1e-4 else (1.0 / len(peers))
                    yb[bidx] -= delta * share

            y_prop = self.S @ yb
            return y_prop

        elif target_uid in [f"India/{r}" for r in REGIONS]:
            # Regional node edited
            children = self.region_children[target_uid]
            unpinned_children = [c for c in children if c not in pinned_bottom]

            cur_reg_val = y0[target_idx]
            delta_reg = new_val - cur_reg_val

            # Distribute delta_reg among unpinned children proportionally to base values
            child_base_sum = sum(y0[self.uid_to_idx[c]] for c in unpinned_children)
            for c in unpinned_children:
                bidx = self.bottom_to_idx[c]
                base_c = y0[self.uid_to_idx[c]]
                share = (base_c / child_base_sum) if child_base_sum > 1e-4 else (1.0 / len(unpinned_children))
                yb[bidx] = base_c + delta_reg * share

            # If National total is pinned, remaining unpinned regions absorb -delta_reg
            if "India" in pinned_set:
                other_regs = [f"India/{r}" for r in REGIONS if f"India/{r}" != target_uid and f"India/{r}" not in pinned_set]
                other_unpinned_bottom = [b for b in self.bottom_uids if any(b.startswith(f"{r}/") for r in other_regs) and b not in pinned_bottom]
                other_sum = sum(y0[self.uid_to_idx[b]] for b in other_unpinned_bottom)
                for b in other_unpinned_bottom:
                    bidx = self.bottom_to_idx[b]
                    share = (y0[self.uid_to_idx[b]] / other_sum) if other_sum > 1e-4 else (1.0 / len(other_unpinned_bottom))
                    yb[bidx] -= delta_reg * share

            y_prop = self.S @ yb
            return y_prop

        elif target_uid == "India":
            # National node edited
            unpinned_bottom = [b for b in self.bottom_uids if b not in pinned_bottom]
            delta_nat = new_val - y0[target_idx]

            base_bottom_sum = sum(y0[self.uid_to_idx[b]] for b in unpinned_bottom)
            for b in unpinned_bottom:
                bidx = self.bottom_to_idx[b]
                base_b = y0[self.uid_to_idx[b]]
                share = (base_b / base_bottom_sum) if base_bottom_sum > 1e-4 else (1.0 / len(unpinned_bottom))
                yb[bidx] = base_b + delta_nat * share

            y_prop = self.S @ yb
            return y_prop

        else:
            raise ValueError(f"Unknown target_node: {target_uid}")

    def _solve_covariance_aware(
        self,
        y0: np.ndarray,
        target_uid: str,
        new_val: float,
        pinned_uids: List[str],
    ) -> np.ndarray:
        """
        Covariance-aware allocation:
        Solves constrained weighted least-squares:
            min_{yb} 1/2 (yb - yb0)^T H (yb - yb0)
            s.t.  C yb = d
        where H = S.T @ W @ S, C contains the rows of S for target and pinned nodes,
        and d contains target values.
        """
        target_idx = self.uid_to_idx[target_uid]
        yb0 = np.array([y0[self.uid_to_idx[b]] for b in self.bottom_uids], dtype=float)

        constraint_indices = [target_idx]
        d_vals = [new_val]

        for p in pinned_uids:
            if p != target_uid and p in self.uid_to_idx:
                pidx = self.uid_to_idx[p]
                constraint_indices.append(pidx)
                d_vals.append(y0[pidx])

        C = self.S[constraint_indices, :]
        d = np.array(d_vals, dtype=float)

        KKT = np.block([
            [self.H, C.T],
            [C, np.zeros((len(d), len(d)))]
        ])
        rhs = np.concatenate([self.H @ yb0, d])

        sol, _, _, _ = lstsq(KKT, rhs)
        yb_star = sol[:len(yb0)]
        y_cov = self.S @ yb_star
        return y_cov

    def simulate(
        self,
        target_node: str,
        delta: Optional[float] = None,
        pct_change: Optional[float] = None,
        new_value: Optional[float] = None,
        pinned_nodes: Optional[List[str]] = None,
        base_vector: Optional[Dict[str, float]] = None,
        date: Optional[str] = None,
        horizon: int = 1,
    ) -> Dict[str, Any]:
        """
        Execute scenario simulation on the hierarchy.

        Returns full dictionary with base, proportional, covariance_aware, differences,
        coherence confirmation, flags, warnings, and disclaimer.
        """
        if target_node not in self.uid_to_idx:
            raise ValueError(f"Target node '{target_node}' not found in 51-node hierarchy.")

        pinned = [p for p in (pinned_nodes or []) if p in self.uid_to_idx and p != target_node]

        # 1. Base vector
        if base_vector is not None:
            base_dict = {uid: float(base_vector[uid]) for uid in self.uids if uid in base_vector}
        else:
            base_dict = self.get_base_forecast(date=date, horizon=horizon)

        y0 = np.array([base_dict[uid] for uid in self.uids], dtype=float)
        base_val = y0[self.uid_to_idx[target_node]]

        # 2. Compute new target value
        if new_value is not None:
            computed_new_val = float(new_value)
            computed_delta = computed_new_val - base_val
            computed_pct = (computed_delta / base_val * 100.0) if abs(base_val) > 1e-4 else 0.0
        elif pct_change is not None:
            computed_pct = float(pct_change)
            computed_delta = base_val * (computed_pct / 100.0)
            computed_new_val = base_val + computed_delta
        elif delta is not None:
            computed_delta = float(delta)
            computed_new_val = base_val + computed_delta
            computed_pct = (computed_delta / base_val * 100.0) if abs(base_val) > 1e-4 else 0.0
        else:
            raise ValueError("Must specify at least one of: delta, pct_change, or new_value.")

        # 3. Solve Proportional
        y_prop_arr = self._solve_proportional(y0, target_node, computed_new_val, pinned)
        prop_dict = {uid: float(y_prop_arr[i]) for i, uid in enumerate(self.uids)}

        # 4. Solve Covariance-Aware
        y_cov_arr = self._solve_covariance_aware(y0, target_node, computed_new_val, pinned)
        cov_dict = {uid: float(y_cov_arr[i]) for i, uid in enumerate(self.uids)}

        # 5. Differences (Covariance-Aware minus Proportional)
        diff_dict = {uid: float(cov_dict[uid] - prop_dict[uid]) for uid in self.uids}

        # 6. Verify coherence (< 1e-6)
        prop_coherent, prop_max_diff = self.check_coherence(prop_dict)
        cov_coherent, cov_max_diff = self.check_coherence(cov_dict)
        assert prop_coherent, f"Proportional allocation coherence failure: max diff {prop_max_diff}"
        assert cov_coherent, f"Covariance-aware allocation coherence failure: max diff {cov_max_diff}"

        # 7. Check warnings & flags & heuristic stress alerts
        cov_warnings = self.check_historical_warnings(cov_dict)
        cov_flags = self.check_below_zero_flags(cov_dict)
        prop_flags = self.check_below_zero_flags(prop_dict)

        combined_flags = sorted(list(set(cov_flags + prop_flags)))

        if date is not None:
            eval_month = pd.Timestamp(date).month
        elif self._forecasts_df is not None:
            eval_month = pd.Timestamp(self._forecasts_df["ds"].max()).month
        else:
            eval_month = 7
        stress_alerts = self.alert_engine.evaluate_scenario(cov_dict, month=eval_month)

        return {
            "target_node": target_node,
            "base_value": round(base_val, 3),
            "new_value": round(computed_new_val, 3),
            "delta": round(computed_delta, 3),
            "pct_change": round(computed_pct, 2),
            "pinned_nodes": pinned,
            "base_forecast": {uid: round(float(y0[i]), 3) for i, uid in enumerate(self.uids)},
            "proportional": {uid: float(prop_dict[uid]) for uid in self.uids},
            "covariance_aware": {uid: float(cov_dict[uid]) for uid in self.uids},
            "diff_cov_minus_prop": {uid: float(diff_dict[uid]) for uid in self.uids},
            "coherence_verified": bool(prop_coherent and cov_coherent),
            "max_coherence_diff": float(max(prop_max_diff, cov_max_diff)),
            "warnings": cov_warnings,
            "flags": combined_flags,
            "alerts": stress_alerts,
            "disclaimer": DISCLAIMER_TEXT,
        }
