"""
schemas.py
Pydantic schemas for the TerraWatt v2 API (/api/v1).
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IngestPayload(BaseModel):
    node_id: str
    date: str
    actual_value: float


class HealthResponse(BaseModel):
    status: str
    version: str = "v2.0"


class MetaResponse(BaseModel):
    model_version: str
    data_source: str
    reliable_data_start: str
    reliable_data_end: str
    total_reliable_rows: int
    train_full_period: Dict[str, Any]
    validation_block: Dict[str, Any]
    test_holdout_period: Dict[str, Any]
    library_versions: Dict[str, str]
    git_hash: str
    drift_status: Optional[Dict[str, Any]] = None
    staleness_warning: Optional[str] = None
    retraining_instructions: Optional[str] = None


class NodeMetadata(BaseModel):
    node_id: str
    name: str
    level: str  # "Country", "Region", "State"
    parent: Optional[str] = None
    children: List[str] = []
    is_real: bool = True
    historical_range: Optional[Dict[str, float]] = None


class NodesResponse(BaseModel):
    total_nodes: int
    nodes: List[NodeMetadata]


class ForecastPoint(BaseModel):
    ds: str
    horizon: int
    actual: Optional[float] = None
    base_forecast: float
    reconciled_forecast: float
    q90_lower: Optional[float] = None
    q90_upper: Optional[float] = None
    q95_lower: Optional[float] = None
    q95_upper: Optional[float] = None


class ForecastResponse(BaseModel):
    node_id: str
    horizon_days: int
    unit: str = "MU/day"
    series: List[ForecastPoint]


class HierarchyNodeValue(BaseModel):
    node_id: str
    name: str
    value: float
    unit: str = "MU/day"
    children: List[str] = []


class HierarchySnapshotResponse(BaseModel):
    date: str
    horizon: int
    mode: str  # "actual" | "unreconciled" | "reconciled"
    unit: str = "MU/day"
    national: HierarchyNodeValue
    regions: Dict[str, HierarchyNodeValue]
    bottom_level: Dict[str, HierarchyNodeValue]
    coherence_gap_mu: float
    is_coherent: bool


class ScenarioRequest(BaseModel):
    target_node: str = Field(..., description="Node unique_id to shock, e.g. 'India', 'India/NR', 'India/NR/Delhi'")
    delta: Optional[float] = Field(None, description="Additive change in MU/day")
    pct_change: Optional[float] = Field(None, description="Percentage change (+/- 15% slider)")
    new_value: Optional[float] = Field(None, description="Explicit new target value in MU/day")
    pinned_nodes: Optional[List[str]] = Field(default=[], description="List of node unique_ids held strictly fixed")
    date: Optional[str] = Field(None, description="Reference forecast date (default latest)")
    horizon: int = Field(default=1, description="Forecast horizon 1..14")


class ScenarioResponse(BaseModel):
    target_node: str
    base_value: float
    new_value: float
    delta: float
    pct_change: float
    pinned_nodes: List[str]
    base_forecast: Dict[str, float]
    proportional: Dict[str, float]
    covariance_aware: Dict[str, float]
    diff_cov_minus_prop: Dict[str, float]
    coherence_verified: bool
    max_coherence_diff: float
    warnings: List[str]
    flags: List[str]
    alerts: List[Dict[str, Any]]
    disclaimer: str


class AlertItem(BaseModel):
    indicator_type: str
    region: str
    severity: str  # "info" | "watch" | "critical"
    title: str
    message: str
    evidence: Dict[str, Any]
    is_heuristic: bool = True
    caveat: str


class AlertsResponse(BaseModel):
    total_alerts: int
    date: Optional[str] = None
    month: int
    alerts: List[AlertItem]
    caveat: str


class BacktestPoint(BaseModel):
    ds: str
    actual: float
    unreconciled: float
    reconciled: float
    error_unreconciled: float
    error_reconciled: float
    abs_error_unreconciled: float
    abs_error_reconciled: float


class BacktestResponse(BaseModel):
    node_id: str
    horizon: int
    start_date: str
    end_date: str
    sample_days: int
    metrics_summary: Dict[str, Any]
    series: List[BacktestPoint]


class MetricsResponse(BaseModel):
    test_metrics_by_level: List[Dict[str, Any]]
    test_metrics_by_horizon: List[Dict[str, Any]]
    conformal_coverage: List[Dict[str, Any]]


class SavingsRequest(BaseModel):
    baseline: str = Field(default="unreconciled", description="unreconciled, seasonal_naive_7d, seasonal_naive_364d, day_ahead_persistence")
    price_under: float = Field(default=6.50, description="Shortfall / emergency procurement price per kWh in Rupees")
    price_over: float = Field(default=3.50, description="Surplus / DSM distress sale price per kWh in Rupees")
    horizon: int = Field(default=1, description="Horizon 1..14")


class SavingsResponse(BaseModel):
    baseline_name: str
    horizon: int
    test_days_count: int
    test_period_start: str
    test_period_end: str
    mean_daily_baseline_mismatch_mu: float
    mean_daily_reconciled_mismatch_mu: float
    mean_daily_avoided_mismatch_mu: float
    annualized_avoided_mismatch_mu: float
    pct_lower_than_baseline: float
    bootstrap_ci_95: Dict[str, Any]
    regional_breakdown: Dict[str, Any]
    valuation: Dict[str, Any]
    planning_inconsistency: Dict[str, Any]
    headline_text: str
    note: str
    citable_price_sources: Dict[str, Any]
