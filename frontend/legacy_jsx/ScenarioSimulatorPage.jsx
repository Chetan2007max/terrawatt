import { useState, useEffect, useCallback } from "react";
import { simulateScenario, getNodes } from "../api";

export default function ScenarioSimulatorPage() {
  const [nodes, setNodes] = useState([]);
  const [targetNode, setTargetNode] = useState("India");
  const [pctChange, setPctChange] = useState(10);
  const [selectedMethod, setSelectedMethod] = useState("covariance_aware");
  const [pinnedNodes, setPinnedNodes] = useState([]);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await getNodes();
        if (res?.nodes) {
          const nList = res.nodes.map((n) => (typeof n === "object" ? n.node_id : n));
          setNodes(nList);
        }
      } catch (err) {
        console.error("Failed to fetch nodes", err);
      }
    }
    loadNodes();
  }, []);

  const runSimulation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        target_node: targetNode,
        pct_change: parseFloat(pctChange),
        pinned_nodes: pinnedNodes,
        horizon: 1,
      };
      const res = await simulateScenario(payload);
      setSimResult(res);
    } catch (err) {
      console.error(err);
      setError(err.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  }, [targetNode, pctChange, pinnedNodes]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  function handlePinToggle(node) {
    if (pinnedNodes.includes(node)) {
      setPinnedNodes(pinnedNodes.filter((n) => n !== node));
    } else {
      setPinnedNodes([...pinnedNodes, node]);
    }
  }

  const activeAlloc =
    selectedMethod === "covariance_aware"
      ? (simResult?.covariance_aware || simResult?.covariance_aware_results || {})
      : (simResult?.proportional || simResult?.proportional_results || {});

  const baselineMap = simResult?.base_forecast || simResult?.baseline_values || {};
  const nationalBefore = Number(baselineMap["India"] || 5330.18);
  const nationalAfter = Number(activeAlloc?.["India"] || nationalBefore);
  const nationalDelta = nationalAfter - nationalBefore;
  const nationalPct = nationalBefore > 0 ? (nationalDelta / nationalBefore) * 100 : 0;

  const regions = ["NR", "WR", "SR", "ER", "NER"];

  return (
    <div className="page scenario-page">
      <div className="page-header">
        <h2>What-If Scenario Simulator &amp; Stress Analyzer</h2>
        <p className="subtext">
          Simulate grid shocks and explore coherent mathematical redistribution across India's 51 nodes.
        </p>
      </div>

      {/* Mandatory Statistical Redistribution Disclaimer Banner */}
      <div className="disclaimer-banner mono">
        <span className="banner-icon">⚖</span>
        <div>
          <strong>Statistical Redistribution Notice:</strong>
          <div>{simResult?.disclaimer || "This is a statistical redistribution, not a power-flow simulation."}</div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="panel filter-panel">
        <div className="control-group">
          <label>Target Node to Shock ({nodes.length || 51} Available):</label>
          <select
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
            className="select-dropdown"
          >
            <option value="India">🇮🇳 India (National Total)</option>
            <optgroup label="Regions">
              <option value="India/NR">Northern Region (NR)</option>
              <option value="India/WR">Western Region (WR)</option>
              <option value="India/SR">Southern Region (SR)</option>
              <option value="India/ER">Eastern Region (ER)</option>
              <option value="India/NER">North Eastern Region (NER)</option>
            </optgroup>
            <optgroup label="Sample States">
              <option value="India/NR/Delhi">Delhi</option>
              <option value="India/WR/Maharashtra">Maharashtra</option>
              <option value="India/WR/Gujarat">Gujarat</option>
              <option value="India/SR/Tamil Nadu">Tamil Nadu</option>
              <option value="India/NR/Uttar Pradesh">Uttar Pradesh</option>
              <option value="India/ER/West Bengal">West Bengal</option>
            </optgroup>
          </select>
        </div>

        <div className="control-group slider-group">
          <div className="slider-label-row">
            <label>Shock Percentage:</label>
            <span className={`slider-val mono ${pctChange >= 0 ? "text-amber" : "text-cyan"}`}>
              {pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`}
            </span>
          </div>
          <input
            type="range"
            min="-15"
            max="15"
            step="1"
            value={pctChange}
            onChange={(e) => setPctChange(parseFloat(e.target.value))}
            className="range-slider"
          />
          <div className="slider-ticks mono">
            <span>-15%</span>
            <span>-10%</span>
            <span>0%</span>
            <span>+10%</span>
            <span>+15%</span>
          </div>
        </div>

        <div className="control-group">
          <label>Allocation Algorithm:</label>
          <div className="btn-toggle-group">
            <button
              className={`toggle-btn ${selectedMethod === "covariance_aware" ? "active" : ""}`}
              onClick={() => setSelectedMethod("covariance_aware")}
            >
              Covariance-Aware (KKT)
            </button>
            <button
              className={`toggle-btn ${selectedMethod === "proportional" ? "active" : ""}`}
              onClick={() => setSelectedMethod("proportional")}
            >
              Proportional (Uniform)
            </button>
          </div>
        </div>
      </div>

      {/* Pinned Nodes Selector */}
      <div className="panel pinned-panel">
        <div className="panel-head">
          <h4>Pin Nodes (Lock Demand During Reallocation)</h4>
          <span className="subtext mono">
            {pinnedNodes.length === 0 ? "None pinned" : `${pinnedNodes.length} locked`}
          </span>
        </div>
        <div className="pill-container">
          {["India/NR", "India/WR", "India/SR", "India/ER", "India/NER", "India/NR/Delhi", "India/WR/Maharashtra", "India/SR/Kerala", "India/NER/Assam"].map((pNode) => {
            const isPinned = pinnedNodes.includes(pNode);
            const shortName = pNode.split("/").pop();
            return (
              <button
                key={pNode}
                type="button"
                className={`pill-btn ${isPinned ? "pill-active" : ""}`}
                onClick={() => handlePinToggle(pNode)}
              >
                {isPinned ? `🔒 ${shortName}` : `+ ${shortName}`}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="panel error-state">
          <p>{error}</p>
        </div>
      )}

      {/* Before and After Headline Cards */}
      <div className="scenario-headline-box">
        <div className="headline-col">
          <span className="lbl">Baseline Forecast:</span>
          <span className="num mono">{nationalBefore.toFixed(1)} <span className="unit">MU/day</span></span>
        </div>
        <div className="headline-arrow">➔</div>
        <div className="headline-col">
          <span className="lbl">Shocked Forecast ({selectedMethod}):</span>
          <span className="num mono text-amber">{nationalAfter.toFixed(1)} <span className="unit">MU/day</span></span>
        </div>
        <div className="headline-col">
          <span className="lbl">Net Reallocation:</span>
          <span className={`num mono ${nationalDelta >= 0 ? "text-amber" : "text-cyan"}`}>
            {nationalDelta >= 0 ? `+${nationalDelta.toFixed(1)}` : nationalDelta.toFixed(1)} MU/day ({nationalPct >= 0 ? `+${nationalPct.toFixed(1)}%` : `${nationalPct.toFixed(1)}%`})
          </span>
        </div>
      </div>

      {/* Regional Impact Breakdown Cards */}
      <div className="regions">
        {regions.map((reg) => {
          const rKey = `India/${reg}`;
          const bVal = Number(baselineMap[rKey] ?? baselineMap[reg] ?? 0);
          const aVal = Number(activeAlloc[rKey] ?? activeAlloc[reg] ?? bVal);
          const dVal = aVal - bVal;
          const dPct = bVal > 0 ? (dVal / bVal) * 100 : 0;
          const isTarget = targetNode === reg || targetNode === rKey;
          const isPinned = pinnedNodes.includes(reg) || pinnedNodes.includes(rKey);

          return (
            <div key={reg} className={`region-card ${isTarget ? "card-target" : ""} ${isPinned ? "card-pinned" : ""}`}>
              <div className="name">
                {reg} {isPinned && "🔒"} {isTarget && "🎯"}
              </div>
              <div className="value">
                {aVal.toFixed(1)} <span className="unit">MU/day</span>
              </div>
              <div className="scenario-delta mono">
                Baseline: {bVal.toFixed(1)} MU
              </div>
              <div className={`scenario-change mono ${dVal >= 0 ? "err-pos" : "err-neg"}`}>
                {dVal >= 0 ? `+${dVal.toFixed(1)}` : dVal.toFixed(1)} MU ({dPct >= 0 ? `+${dPct.toFixed(1)}%` : `${dPct.toFixed(1)}%`})
              </div>
            </div>
          );
        })}
      </div>

      {/* Difference Table: Proportional vs Covariance-Aware */}
      <div className="panel">
        <div className="panel-head">
          <h3>Algorithm Divergence: Covariance-Aware vs. Proportional Allocation</h3>
          <span className="subtext mono">Notice how Covariance-Aware allocation assigns shock based on historical error variance</span>
        </div>

        <div className="table-responsive">
          <table className="data-table mono">
            <thead>
              <tr>
                <th>Region</th>
                <th>Baseline</th>
                <th>Proportional</th>
                <th>Covariance-Aware</th>
                <th>Difference (KKT - Prop)</th>
                <th>Grid Behaviour Insight</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((reg) => {
                const rKey = `India/${reg}`;
                const bVal = Number(baselineMap[rKey] ?? baselineMap[reg] ?? 0);
                const propVal = Number(simResult?.proportional?.[rKey] ?? simResult?.proportional?.[reg] ?? bVal);
                const covVal = Number(simResult?.covariance_aware?.[rKey] ?? simResult?.covariance_aware?.[reg] ?? bVal);
                const diff = covVal - propVal;

                let insight = "Balanced historical volatility";
                if (reg === "NR") insight = "Higher weather & cooling sensitivity absorbs greater load swings";
                else if (reg === "NER") insight = "Low historical variance shields small transmission-constrained grid";
                else if (reg === "WR") insight = "High baseload industrial demand moderates swing";

                return (
                  <tr key={reg}>
                    <td className="font-bold">{reg}</td>
                    <td>{bVal.toFixed(1)}</td>
                    <td>{propVal.toFixed(1)}</td>
                    <td className="text-cyan font-bold">{covVal.toFixed(1)}</td>
                    <td className={diff >= 0 ? "err-pos font-bold" : "err-neg font-bold"}>
                      {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} MU/day
                    </td>
                    <td className="subtext">{insight}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Heuristic Stress Alerts */}
      <div className="panel stress-panel">
        <div className="panel-head">
          <h3>Heuristic Stress Indicators (Triggered by Scenario)</h3>
          <span className="unit-badge mono">{loading ? "Evaluating…" : "Phase D Rules"}</span>
        </div>

        {simResult?.alerts && simResult.alerts.length > 0 ? (
          <div className="alert-list">
            {simResult.alerts.map((alert, idx) => (
              <div key={idx} className={`alert-card alert-${alert.severity || "watch"}`}>
                <div className="alert-header">
                  <span className={`badge-severity badge-${alert.severity || "watch"} mono`}>
                    {(alert.severity || "watch").toUpperCase()}
                  </span>
                  <strong className="alert-type">{alert.title || alert.indicator_type}</strong>
                  <span className="alert-node mono">{alert.region}</span>
                </div>
                <p className="alert-msg">{alert.message}</p>
                {alert.evidence && (
                  <div className="alert-evidence mono">
                    Evidence: {JSON.stringify(alert.evidence).replace(/[{}"]/g, " ").trim()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-alerts mono">
            ✓ No stress thresholds exceeded under current scenario parameters.
          </div>
        )}

        <div className="stress-caveat mono">
          ⚠ Stress Indicator Caveat: {simResult?.alerts?.[0]?.caveat || "Ignores transmission limits, plant outages, inter-regional transfer limits, and intraday peaks, because the data is daily."}
        </div>
      </div>
    </div>
  );
}
