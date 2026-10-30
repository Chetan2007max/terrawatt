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
  Filler,
} from "chart.js";
import { getForecast, getNodes } from "../api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function ForecastPage() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState("India");
  const [horizon, setHorizon] = useState(14);
  const [showIntervals, setShowIntervals] = useState(true);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await getNodes();
        if (res?.nodes) {
          // res.nodes is an array of objects or strings
          const nList = res.nodes.map((n) => (typeof n === "object" ? n.node_id : n));
          setNodes(nList);
        }
      } catch (err) {
        console.error("Failed to fetch nodes", err);
      }
    }
    loadNodes();
  }, []);

  const fetchNodeForecast = useCallback(async (node, h, intervals) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getForecast(node, h, intervals);
      setForecastData(data);
    } catch (err) {
      console.error(err);
      setError(`Failed to fetch forecast for ${node}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodeForecast(selectedNode, horizon, showIntervals);
  }, [selectedNode, horizon, showIntervals, fetchNodeForecast]);

  const series = forecastData?.series || [];

  // Compute forward target date from origin date and horizon days
  function getTargetDate(originDateStr, horizonDays) {
    if (!originDateStr) return `Day +${horizonDays}`;
    const dt = new Date(originDateStr);
    if (isNaN(dt.getTime())) return `Day +${horizonDays}`;
    dt.setDate(dt.getDate() + Number(horizonDays));
    return dt.toISOString().slice(0, 10);
  }

  // CSV Export Handler
  function handleExportCSV() {
    if (series.length === 0) return;

    const headers = [
      "origin_date",
      "target_date",
      "horizon_days",
      "node",
      "base_forecast_mu_day",
      "reconciled_forecast_mu_day",
      "mint_adjustment_mu_day",
      "q90_lower_mu_day",
      "q90_upper_mu_day",
      "q95_lower_mu_day",
      "q95_upper_mu_day",
    ];

    const rows = series.map((d) => [
      d.ds,
      getTargetDate(d.ds, d.horizon),
      d.horizon,
      selectedNode,
      d.base_forecast?.toFixed(2) ?? "",
      d.reconciled_forecast?.toFixed(2) ?? "",
      ((d.reconciled_forecast || 0) - (d.base_forecast || 0)).toFixed(2),
      d.q90_lower?.toFixed(2) ?? "",
      d.q90_upper?.toFixed(2) ?? "",
      d.q95_lower?.toFixed(2) ?? "",
      d.q95_upper?.toFixed(2) ?? "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeNode = selectedNode.replace(/[/\s]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `terrawatt_forecast_${safeNode}_${horizon}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Prepare Chart Data
  const labels = series.map((d) => `${getTargetDate(d.ds, d.horizon)} (h=${d.horizon})`);
  const baseValues = series.map((d) => d.base_forecast);
  const reconciledValues = series.map((d) => d.reconciled_forecast);
  const upper95 = series.map((d) => d.q95_upper);
  const lower95 = series.map((d) => d.q95_lower);
  const upper80 = series.map((d) => d.q90_upper);
  const lower80 = series.map((d) => d.q90_lower);

  const chartDatasets = [
    {
      label: "Reconciled (MinT)",
      data: reconciledValues,
      borderColor: "#00D2FF",
      backgroundColor: "#00D2FF",
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.25,
      order: 1,
    },
    {
      label: "Base Model (Unreconciled)",
      data: baseValues,
      borderColor: "#586F7C",
      backgroundColor: "#586F7C",
      borderWidth: 1.5,
      borderDash: [5, 5],
      pointRadius: 3,
      tension: 0.25,
      order: 2,
    },
  ];

  if (showIntervals && upper95.length > 0) {
    chartDatasets.push(
      {
        label: "95% Conformal Upper",
        data: upper95,
        borderColor: "rgba(255, 230, 0, 0.65)",
        backgroundColor: "rgba(255, 230, 0, 0.08)",
        borderWidth: 1,
        borderDash: [2, 2],
        fill: "+1",
        pointRadius: 0,
        order: 3,
      },
      {
        label: "95% Conformal Lower",
        data: lower95,
        borderColor: "rgba(255, 230, 0, 0.65)",
        backgroundColor: "rgba(255, 230, 0, 0.08)",
        borderWidth: 1,
        borderDash: [2, 2],
        fill: false,
        pointRadius: 0,
        order: 4,
      },
      {
        label: "80% Conformal Upper",
        data: upper80,
        borderColor: "rgba(0, 210, 255, 0.45)",
        backgroundColor: "rgba(0, 210, 255, 0.08)",
        borderWidth: 1,
        fill: "+1",
        pointRadius: 0,
        order: 5,
      },
      {
        label: "80% Conformal Lower",
        data: lower80,
        borderColor: "rgba(0, 210, 255, 0.45)",
        backgroundColor: "rgba(0, 210, 255, 0.08)",
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        order: 6,
      }
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#F4F4F9",
          font: { family: "Outfit", size: 12, weight: "600" },
          filter: (item) => !item.text.includes("Lower"),
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
        ticks: { color: "#586F7C", font: { family: "JetBrains Mono", size: 11 } },
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

  const nationalNodes = nodes.filter((n) => n === "India");
  const regionNodes = nodes.filter((n) => n.startsWith("India/") && n.split("/").length === 2);
  const stateNodes = nodes.filter((n) => n.split("/").length > 2);

  return (
    <div className="page forecast-page">
      <div className="page-header">
        <h2>Multi-Horizon Node Forecast</h2>
        <p className="subtext">
          Inspect multi-horizon demand forecasts across all 51 nodes in the national grid, with split-conformal uncertainty intervals and MinTrace reconciliation.
        </p>
      </div>

      {/* Control Toolbar */}
      <div className="panel filter-panel">
        <div className="control-group">
          <label>Select Hierarchy Node ({nodes.length || 51} Nodes):</label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="select-dropdown"
          >
            <optgroup label="National (Level 0)">
              {nationalNodes.length > 0 ? (
                nationalNodes.map((n) => <option key={n} value={n}>{n}</option>)
              ) : (
                <option value="India">India</option>
              )}
            </optgroup>
            <optgroup label="Regions (Level 1)">
              {regionNodes.length > 0 ? (
                regionNodes.map((n) => <option key={n} value={n}>{n}</option>)
              ) : (
                ["India/NR", "India/WR", "India/SR", "India/ER", "India/NER"].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))
              )}
            </optgroup>
            <optgroup label="States &amp; Residuals (Level 2)">
              {stateNodes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="control-group">
          <label>Forecast Horizon: <span className="mono text-amber">{horizon} Days</span></label>
          <input
            type="range"
            min="1"
            max="14"
            value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value, 10))}
            className="range-slider"
          />
        </div>

        <div className="control-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showIntervals}
              onChange={(e) => setShowIntervals(e.target.checked)}
            />
            Conformal Intervals (80% &amp; 95%)
          </label>
        </div>

        <div className="control-group btn-group">
          <button onClick={handleExportCSV} className="btn btn-amber" disabled={loading || series.length === 0}>
            📥 Export CSV ({horizon} Days)
          </button>
        </div>
      </div>

      {error && (
        <div className="panel error-state">
          <p>{error}</p>
        </div>
      )}

      {/* Forecast Chart Panel */}
      <div className="panel chart-panel">
        <div className="panel-head">
          <div>
            <h3>{selectedNode} — {horizon}-Day Forecast Horizon</h3>
            <div className="subtext mono">
              Target Dates: {labels[0]} to {labels[labels.length - 1]} | Unit: MU / day
            </div>
          </div>
          {loading && <div className="spinner-inline">Loading…</div>}
        </div>

        <div style={{ height: "380px", width: "100%" }}>
          <Line data={{ labels, datasets: chartDatasets }} options={chartOptions} />
        </div>
      </div>

      {/* Forecast Table Panel */}
      <div className="panel table-panel">
        <div className="panel-head">
          <h3>Daily Tabular Breakdown ({selectedNode})</h3>
          <span className="unit-badge mono">All numbers in MU / day</span>
        </div>

        <div className="table-responsive">
          <table className="data-table mono">
            <thead>
              <tr>
                <th>Target Date</th>
                <th>Horizon</th>
                <th>Base Model</th>
                <th>Reconciled (MinT)</th>
                <th>MinT Delta</th>
                {showIntervals && <th>80% Interval</th>}
                {showIntervals && <th>95% Interval</th>}
              </tr>
            </thead>
            <tbody>
              {series.map((row) => {
                const delta = (row.reconciled_forecast || 0) - (row.base_forecast || 0);
                const targetDate = getTargetDate(row.ds, row.horizon);
                return (
                  <tr key={`${row.ds}-${row.horizon}`}>
                    <td>
                      <strong>{targetDate}</strong>
                      <span className="subtext" style={{ display: "block", fontSize: "10px", color: "var(--blue-slate)" }}>
                        origin: {row.ds}
                      </span>
                    </td>
                    <td><span className="node-badge mono">h = {row.horizon}</span></td>
                    <td className="text-dim">{row.base_forecast?.toFixed(2)}</td>
                    <td className="text-cyan font-bold">{row.reconciled_forecast?.toFixed(2)}</td>
                    <td className={delta >= 0 ? "err-pos" : "err-neg"}>
                      {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                    </td>
                    {showIntervals && (
                      <td className="subtext">
                        [{row.q90_lower?.toFixed(1)}, {row.q90_upper?.toFixed(1)}]
                      </td>
                    )}
                    {showIntervals && (
                      <td className="subtext">
                        [{row.q95_lower?.toFixed(1)}, {row.q95_upper?.toFixed(1)}]
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
