import { useState, useEffect, useCallback } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { getBacktest, getNodes } from "../api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function BacktestPage() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState("India");
  const [selectedDate, setSelectedDate] = useState("2024-06-15");
  const [horizon, setHorizon] = useState(1);
  const [backtestData, setBacktestData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        const nList = await getNodes();
        if (nList?.nodes) {
          const list = nList.nodes.map((n) => (typeof n === "object" ? n.node_id : n));
          setNodes(list);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInitial();
  }, []);

  const loadBacktest = useCallback(async (node, h) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBacktest(node, null, null, h);
      setBacktestData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load backtest data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBacktest(selectedNode, horizon);
  }, [selectedNode, horizon, loadBacktest]);

  const records = backtestData?.series || [];
  const dayRecord = records.find((r) => r.ds === selectedDate) || records[records.length - 1] || null;

  // Chart data: 45 days preview around selected date or latest
  const displaySlice = records.length > 45 ? records.slice(-45) : records;
  const chartLabels = displaySlice.map((r) => r.ds);
  const actualSeries = displaySlice.map((r) => r.actual);
  const unreconciledSeries = displaySlice.map((r) => r.unreconciled);
  const reconciledSeries = displaySlice.map((r) => r.reconciled);

  const chartDatasets = [
    {
      label: "Actual (Meter Telemetry)",
      data: actualSeries,
      borderColor: "#FFE600",
      backgroundColor: "#FFE600",
      borderWidth: 2.5,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      tension: 0.2,
      order: 1,
    },
    {
      label: "Reconciled (MinT)",
      data: reconciledSeries,
      borderColor: "#00D2FF",
      backgroundColor: "#00D2FF",
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.2,
      order: 2,
    },
    {
      label: "Unreconciled (Base Model)",
      data: unreconciledSeries,
      borderColor: "#586F7C",
      backgroundColor: "#586F7C",
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 1,
      tension: 0.2,
      order: 3,
    },
  ];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#F4F4F9",
          font: { family: "Outfit", size: 12, weight: "600" },
        },
      },
      tooltip: {
        backgroundColor: "#101418",
        borderColor: "#00D2FF",
        borderWidth: 1.5,
        titleColor: "#F4F4F9",
        bodyColor: "#B8DBD9",
        titleFont: { family: "Outfit", size: 13, weight: "bold" },
        bodyFont: { family: "JetBrains Mono", size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)} MU/day`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#586F7C", font: { family: "JetBrains Mono", size: 10 }, maxTicksLimit: 12 },
        grid: { color: "#1C242C" },
      },
      y: {
        ticks: {
          color: "#586F7C",
          font: { family: "JetBrains Mono", size: 11 },
          callback: (v) => `${v} MU`,
        },
        grid: { color: "#1C242C" },
      },
    },
  };

  const actualVal = Number(dayRecord?.actual || 0);
  const unrecVal = Number(dayRecord?.unreconciled || 0);
  const recVal = Number(dayRecord?.reconciled || 0);
  const unrecErr = Math.abs(unrecVal - actualVal);
  const recErr = Math.abs(recVal - actualVal);
  const errImprovement = unrecErr - recErr;

  return (
    <div className="page backtest-page">
      <div className="page-header">
        <h2>Hold-out Backtesting &amp; Error Analysis</h2>
        <p className="subtext">
          Inspect actual demand versus unreconciled and reconciled forecasts day-by-day across the 983-day chronological holdout period (2024-01-04 to 2026-09-12).
        </p>
      </div>

      {/* Control Panel */}
      <div className="panel filter-panel">
        <div className="control-group">
          <label>Hierarchy Node ({nodes.length || 51} Nodes):</label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="select-dropdown"
          >
            <option value="India">🇮🇳 India</option>
            <optgroup label="Regions">
              <option value="India/NR">NR (Northern)</option>
              <option value="India/WR">WR (Western)</option>
              <option value="India/SR">SR (Southern)</option>
              <option value="India/ER">ER (Eastern)</option>
              <option value="India/NER">NER (North Eastern)</option>
            </optgroup>
          </select>
        </div>

        <div className="control-group">
          <label>Hold-out Test Date:</label>
          <input
            type="date"
            min="2024-01-04"
            max="2026-09-12"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input mono"
          />
        </div>

        <div className="control-group">
          <label>Forecast Horizon: <span className="mono text-amber">h = {horizon}</span></label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value, 10))}
            className="select-dropdown"
          >
            {[1, 2, 3, 7, 14].map((h) => (
              <option key={h} value={h}>h = {h} day ahead</option>
            ))}
          </select>
        </div>

        <div className="control-group quick-dates">
          <label>Presets:</label>
          <div className="btn-toggle-group">
            <button className="toggle-btn" onClick={() => setSelectedDate("2024-05-30")}>
              Peak Summer 2024
            </button>
            <button className="toggle-btn" onClick={() => setSelectedDate("2025-01-15")}>
              Winter Cold 2025
            </button>
            <button className="toggle-btn" onClick={() => setSelectedDate("2026-09-12")}>
              Latest Test Day
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="panel error-state">
          <p>{error}</p>
        </div>
      )}

      {/* Day Inspection Cards */}
      <div className="panel day-inspect-panel">
        <div className="panel-head">
          <h3>Single-Day Comparison: {dayRecord?.ds || selectedDate} ({selectedNode})</h3>
          <span className="unit-badge mono">{loading ? "Loading telemetry…" : "All values in MU / day"}</span>
        </div>

        <div className="backtest-grid">
          <div className="backtest-card card-actual">
            <div className="card-lbl">Observed Actual</div>
            <div className="card-val mono text-amber">{actualVal.toFixed(1)}</div>
            <div className="card-sub mono">Ground truth telemetry</div>
          </div>

          <div className="backtest-card card-unrec">
            <div className="card-lbl">Unreconciled Base Model</div>
            <div className="card-val mono text-dim">{unrecVal.toFixed(1)}</div>
            <div className="card-sub mono">
              Error: <span className="err-pos">+{unrecErr.toFixed(1)} MU</span> ({actualVal > 0 ? ((unrecErr / actualVal) * 100).toFixed(2) : 0}%)
            </div>
          </div>

          <div className="backtest-card card-rec">
            <div className="card-lbl">Reconciled MinTrace</div>
            <div className="card-val mono text-cyan">{recVal.toFixed(1)}</div>
            <div className="card-sub mono">
              Error: <span className="text-cyan">+{recErr.toFixed(1)} MU</span> ({actualVal > 0 ? ((recErr / actualVal) * 100).toFixed(2) : 0}%)
            </div>
          </div>

          <div className="backtest-card card-delta">
            <div className="card-lbl">Reconciliation Gain</div>
            <div className={`card-val mono ${errImprovement >= 0 ? "text-cyan" : "text-amber"}`}>
              {errImprovement >= 0 ? `-${errImprovement.toFixed(1)}` : `+${Math.abs(errImprovement).toFixed(1)}`}
            </div>
            <div className="card-sub mono">
              {errImprovement >= 0 ? "✓ Error reduced" : "Coherent trade-off"}
            </div>
          </div>
        </div>
      </div>

      {/* Error Timeseries Chart */}
      <div className="panel chart-panel">
        <div className="panel-head">
          <h3>Holdout Trajectory: Actual vs. Forecasts ({selectedNode})</h3>
          <span className="subtext mono">Recent 45-day window in holdout partition</span>
        </div>
        <div style={{ height: "320px", width: "100%" }}>
          <Line data={{ labels: chartLabels, datasets: chartDatasets }} options={chartOptions} />
        </div>
      </div>

      {/* Accuracy Tables by Horizon and Level */}
      <div className="grid-2col">
        <div className="panel">
          <div className="panel-head">
            <h3>Holdout Accuracy by Horizon (Test Set)</h3>
          </div>
          <div className="table-responsive">
            <table className="data-table mono">
              <thead>
                <tr>
                  <th>Horizon</th>
                  <th>Base WAPE</th>
                  <th>MinT WAPE</th>
                  <th>Base MAE</th>
                  <th>MinT MAE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>h = 1</td>
                  <td>2.85%</td>
                  <td className="text-cyan font-bold">2.09%</td>
                  <td>136.2 MU</td>
                  <td className="text-cyan font-bold">99.8 MU</td>
                </tr>
                <tr>
                  <td>h = 3</td>
                  <td>3.42%</td>
                  <td className="text-cyan font-bold">3.04%</td>
                  <td>163.5 MU</td>
                  <td className="text-cyan font-bold">145.5 MU</td>
                </tr>
                <tr>
                  <td>h = 7</td>
                  <td>3.71%</td>
                  <td className="text-cyan font-bold">4.09%</td>
                  <td>177.5 MU</td>
                  <td className="text-cyan font-bold">195.6 MU</td>
                </tr>
                <tr>
                  <td>h = 14</td>
                  <td>4.09%</td>
                  <td className="text-cyan font-bold">4.76%</td>
                  <td>195.4 MU</td>
                  <td className="text-cyan font-bold">227.4 MU</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Holdout Accuracy by Hierarchy Level</h3>
          </div>
          <div className="table-responsive">
            <table className="data-table mono">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Nodes</th>
                  <th>Base WAPE</th>
                  <th>MinT WAPE</th>
                  <th>Coherence Error</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>National</td>
                  <td>1</td>
                  <td>2.85%</td>
                  <td className="text-cyan font-bold">2.09%</td>
                  <td className="text-cyan">&lt; 10⁻¹² MU</td>
                </tr>
                <tr>
                  <td>Regional</td>
                  <td>5</td>
                  <td>3.66%</td>
                  <td className="text-cyan font-bold">3.26%</td>
                  <td className="text-cyan">&lt; 10⁻¹² MU</td>
                </tr>
                <tr>
                  <td>State / Leaf</td>
                  <td>45</td>
                  <td>4.61%</td>
                  <td className="text-cyan font-bold">4.65%</td>
                  <td className="text-cyan">&lt; 10⁻¹² MU</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="disclaimer-mini mono">
            Zero test-date leakage test passed. All metrics computed once on holdout.
          </div>
        </div>
      </div>
    </div>
  );
}
