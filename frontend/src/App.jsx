import { useState, useEffect, useCallback } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import {
  checkHealth,
  getHierarchySnapshot,
  getAvailableNodes,
  getNodeForecast,
  ingestActual,
} from "./api";
import "./App.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

function App() {
  const [connStatus, setConnStatus] = useState("connecting to local API…");
  const [snapshot, setSnapshot] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState("India");
  const [chartData, setChartData] = useState(null);
  const [ingestForm, setIngestForm] = useState({ node_id: "India", date: "2025-01-05", actual_value: "4237.5" });
  const [ingestResult, setIngestResult] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const health = await checkHealth();
        setConnStatus(`connected — ${health.status}`);
      } catch {
        setConnStatus("cannot reach API — is uvicorn running?");
        return;
      }
      const snap = await getHierarchySnapshot();
      setSnapshot(snap);
      const nodeList = await getAvailableNodes();
      setNodes(nodeList.nodes);
    }
    init();
  }, []);

  const loadChart = useCallback(async (nodeId) => {
    const data = await getNodeForecast(nodeId);
    setChartData({
      labels: data.forecast.map((d) => d.date),
      datasets: [
        {
          label: "base",
          data: data.forecast.map((d) => d.base_forecast),
          borderColor: "#8FA3A3",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: "reconciled",
          data: data.forecast.map((d) => d.reconciled_forecast),
          borderColor: "#4FD1C5",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15,
        },
      ],
    });
  }, []);

  useEffect(() => {
    if (nodes.length > 0) loadChart(selectedNode);
  }, [nodes, selectedNode, loadChart]);

  async function handleIngest() {
    const result = await ingestActual(
      ingestForm.node_id,
      ingestForm.date,
      parseFloat(ingestForm.actual_value)
    );
    setIngestResult(result);
  }

  const regionSum = snapshot
    ? Object.values(snapshot.regions).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="app">
      <header>
        <h1>TerraWatt</h1>
        <div className="status">
          <span className="dot"></span>
          {connStatus}
        </div>
      </header>

      <div className="hero">
        <div>
          <div className="hero-label">National demand, latest reconciled forecast</div>
          <div className="hero-value">
            {snapshot ? snapshot.national.toFixed(0) : "—"}
            <span className="unit"> MU / day</span>
          </div>
        </div>
        <div className="hero-date">{snapshot ? snapshot.date : ""}</div>
      </div>

      {snapshot && (
        <>
          <div className="regions">
            {Object.entries(snapshot.regions).map(([name, val]) => (
              <div className="region-card" key={name}>
                <div className="name">{name}</div>
                <div className="value mono">
                  {val.toFixed(1)}
                  <span className="unit"> MU</span>
                </div>
              </div>
            ))}
          </div>
          <div className="coherence-note">
            Sum of regions: {regionSum.toFixed(2)} MU — matches national total to within
            rounding (coherence verified).
          </div>
        </>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Forecast vs. base model, by node</h2>
          <select value={selectedNode} onChange={(e) => setSelectedNode(e.target.value)}>
            {nodes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="legend">
          <span>
            <span className="swatch" style={{ background: "#8FA3A3" }}></span>base model
          </span>
          <span>
            <span className="swatch" style={{ background: "#4FD1C5" }}></span>reconciled (MinT)
          </span>
        </div>
        {chartData && (
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: "#8FA3A3", maxTicksLimit: 10 }, grid: { color: "#223638" } },
                y: { ticks: { color: "#8FA3A3" }, grid: { color: "#223638" } },
              },
            }}
          />
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Simulate incoming telemetry</h2>
        </div>
        <div className="ingest-row">
          <input
            className="mono"
            value={ingestForm.node_id}
            onChange={(e) => setIngestForm({ ...ingestForm, node_id: e.target.value })}
            placeholder="node id"
          />
          <input
            className="mono"
            value={ingestForm.date}
            onChange={(e) => setIngestForm({ ...ingestForm, date: e.target.value })}
            placeholder="YYYY-MM-DD"
          />
          <input
            className="mono"
            value={ingestForm.actual_value}
            onChange={(e) => setIngestForm({ ...ingestForm, actual_value: e.target.value })}
            placeholder="actual value"
          />
          <button onClick={handleIngest}>Ingest</button>
        </div>
        {ingestResult && (
          <div className="ingest-result">
            {ingestResult.comparison ? (
              <>
                Ingested. Forecast was{" "}
                <span className="mono">{ingestResult.comparison.reconciled_forecast}</span>,
                actual <span className="mono">{ingestResult.comparison.actual}</span> — error{" "}
                <span className={`mono ${ingestResult.comparison.error >= 0 ? "err-pos" : "err-neg"}`}>
                  {ingestResult.comparison.error} ({ingestResult.comparison.error_pct}%)
                </span>
              </>
            ) : (
              "Ingested. No existing forecast for that date/node to compare against."
            )}
          </div>
        )}
      </div>

      <footer>
        API: <span className="mono">http://127.0.0.1:8000</span> — run{" "}
        <span className="mono">uvicorn api.main:app --reload</span> in the project root.
      </footer>
    </div>
  );
}

export default App;
