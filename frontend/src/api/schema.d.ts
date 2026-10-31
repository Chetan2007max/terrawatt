/** Auto-generated from FastAPI openapi.json. Do not edit manually. */

export interface AlertItem {
  indicator_type: string;
  region: string;
  severity: string;
  title: string;
  message: string;
  evidence: Record<string, any>;
  is_heuristic?: boolean;
  caveat: string;
}

export interface AlertsResponse {
  total_alerts: number;
  date?: string | any;
  month: number;
  alerts: AlertItem[];
  caveat: string;
}

export interface BacktestPoint {
  ds: string;
  actual: number;
  unreconciled: number;
  reconciled: number;
  error_unreconciled: number;
  error_reconciled: number;
  abs_error_unreconciled: number;
  abs_error_reconciled: number;
}

export interface BacktestResponse {
  node_id: string;
  horizon: number;
  start_date: string;
  end_date: string;
  sample_days: number;
  metrics_summary: Record<string, any>;
  series: BacktestPoint[];
}

export interface ForecastPoint {
  ds: string;
  horizon: number;
  actual?: number | any;
  base_forecast: number;
  reconciled_forecast: number;
  q90_lower?: number | any;
  q90_upper?: number | any;
  q95_lower?: number | any;
  q95_upper?: number | any;
}

export interface ForecastResponse {
  node_id: string;
  horizon_days: number;
  unit?: string;
  series: ForecastPoint[];
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface HealthResponse {
  status: string;
  version?: string;
}

export interface HierarchyNodeValue {
  node_id: string;
  name: string;
  value: number;
  unit?: string;
  children?: string[];
}

export interface HierarchySnapshotResponse {
  date: string;
  horizon: number;
  mode: string;
  unit?: string;
  national: HierarchyNodeValue;
  regions: Record<string, any>;
  bottom_level: Record<string, any>;
  coherence_gap_mu: number;
  is_coherent: boolean;
}

export interface IngestPayload {
  node_id: string;
  date: string;
  actual_value: number;
}

export interface MetaResponse {
  model_version: string;
  data_source: string;
  reliable_data_start: string;
  reliable_data_end: string;
  total_reliable_rows: number;
  train_full_period: Record<string, any>;
  validation_block: Record<string, any>;
  test_holdout_period: Record<string, any>;
  library_versions: Record<string, any>;
  git_hash: string;
  drift_status?: Record<string, any> | any;
  staleness_warning?: string | any;
  retraining_instructions?: string | any;
}

export interface MetricsResponse {
  test_metrics_by_level: Record<string, any>[];
  test_metrics_by_horizon: Record<string, any>[];
  conformal_coverage: Record<string, any>[];
}

export interface NodeMetadata {
  node_id: string;
  name: string;
  level: string;
  parent?: string | any;
  children?: string[];
  is_real?: boolean;
  historical_range?: Record<string, any> | any;
}

export interface NodesResponse {
  total_nodes: number;
  nodes: NodeMetadata[];
}

export interface SavingsRequest {
  /** unreconciled, seasonal_naive_7d, seasonal_naive_364d, day_ahead_persistence */
  baseline?: string;
  /** Shortfall / emergency procurement price per kWh in Rupees */
  price_under?: number;
  /** Surplus / DSM distress sale price per kWh in Rupees */
  price_over?: number;
  /** Horizon 1..14 */
  horizon?: number;
}

export interface SavingsResponse {
  baseline_name: string;
  horizon: number;
  test_days_count: number;
  test_period_start: string;
  test_period_end: string;
  mean_daily_baseline_mismatch_mu: number;
  mean_daily_reconciled_mismatch_mu: number;
  mean_daily_avoided_mismatch_mu: number;
  annualized_avoided_mismatch_mu: number;
  pct_lower_than_baseline: number;
  bootstrap_ci_95: Record<string, any>;
  regional_breakdown: Record<string, any>;
  valuation: Record<string, any>;
  planning_inconsistency: Record<string, any>;
  headline_text: string;
  note: string;
  citable_price_sources: Record<string, any>;
}

export interface ScenarioRequest {
  /** Node unique_id to shock, e.g. 'India', 'India/NR', 'India/NR/Delhi' */
  target_node: string;
  /** Additive change in MU/day */
  delta?: number | any;
  /** Percentage change (+/- 15% slider) */
  pct_change?: number | any;
  /** Explicit new target value in MU/day */
  new_value?: number | any;
  /** List of node unique_ids held strictly fixed */
  pinned_nodes?: string[] | any;
  /** Reference forecast date (default latest) */
  date?: string | any;
  /** Forecast horizon 1..14 */
  horizon?: number;
}

export interface ScenarioResponse {
  target_node: string;
  base_value: number;
  new_value: number;
  delta: number;
  pct_change: number;
  pinned_nodes: string[];
  base_forecast: Record<string, any>;
  proportional: Record<string, any>;
  covariance_aware: Record<string, any>;
  diff_cov_minus_prop: Record<string, any>;
  coherence_verified: boolean;
  max_coherence_diff: number;
  warnings: string[];
  flags: string[];
  alerts: Record<string, any>[];
  disclaimer: string;
}

export interface ValidationError {
  loc: any[];
  msg: string;
  type: string;
  input?: any;
  ctx?: Record<string, any>;
}
