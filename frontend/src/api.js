const API_BASE = "http://127.0.0.1:8000";

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getHierarchySnapshot() {
  const res = await fetch(`${API_BASE}/forecast/hierarchy`);
  return res.json();
}

export async function getAvailableNodes() {
  const res = await fetch(`${API_BASE}/forecast/hierarchy/nodes`);
  return res.json();
}

export async function getNodeForecast(nodeId) {
  const encoded = encodeURIComponent(nodeId);
  const res = await fetch(`${API_BASE}/forecast/${encoded}`);
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
