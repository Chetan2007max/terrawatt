/**
 * api.js
 * Frontend API client connecting to TerraWatt v2 FastAPI backend (/api/v1).
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  return res.json();
}

export async function getMeta() {
  const res = await fetch(`${API_BASE}/api/v1/meta`);
  return res.json();
}

export async function getNodes() {
  const res = await fetch(`${API_BASE}/api/v1/nodes`);
  return res.json();
}

export async function getForecast(node = "India", horizon = 14, intervals = true) {
  const params = new URLSearchParams({ node, horizon, intervals });
  const res = await fetch(`${API_BASE}/api/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch forecast: ${res.statusText}`);
  return res.json();
}

export async function getHierarchy(date = null, horizon = 1, mode = "reconciled") {
  const params = new URLSearchParams({ horizon, mode });
  if (date) params.append("date", date);
  const res = await fetch(`${API_BASE}/api/v1/hierarchy?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch hierarchy: ${res.statusText}`);
  return res.json();
}

export async function simulateScenario(payload) {
  const res = await fetch(`${API_BASE}/api/v1/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Scenario simulation failed");
  }
  return res.json();
}

export async function getAlerts(date = null, region = null, month = null) {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (region) params.append("region", region);
  if (month) params.append("month", month);
  const res = await fetch(`${API_BASE}/api/v1/alerts?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.statusText}`);
  return res.json();
}

export async function getBacktest(node = "India", startDate = null, endDate = null, horizon = 1) {
  const params = new URLSearchParams({ node, horizon });
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const res = await fetch(`${API_BASE}/api/v1/backtest?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch backtest: ${res.statusText}`);
  return res.json();
}

export async function getMetrics(level = null, horizon = null) {
  const params = new URLSearchParams();
  if (level) params.append("level", level);
  if (horizon) params.append("horizon", horizon);
  const res = await fetch(`${API_BASE}/api/v1/metrics?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
  return res.json();
}

export async function calculateSavings(payload) {
  const res = await fetch(`${API_BASE}/api/v1/savings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Savings calculation failed");
  }
  return res.json();
}

export async function ingestActual(nodeId, date, actualValue) {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node_id: nodeId, date, actual_value: actualValue }),
  });
  return res.json();
}

// Backward-compatibility aliases for legacy components
export async function getHierarchySnapshot(date = null, horizon = 1, mode = "reconciled") {
  return getHierarchy(date, horizon, mode);
}

export async function getAvailableNodes() {
  return getNodes();
}

export async function getNodeForecast(nodeId) {
  return getForecast(nodeId, 14, true);
}
