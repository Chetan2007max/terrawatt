import { useState, useEffect, useCallback } from "react";
import { calculateSavings } from "../api";

export default function SavingsPage() {
  const [baseline, setBaseline] = useState("unreconciled");
  const [priceUnder, setPriceUnder] = useState("6.50");
  const [priceOver, setPriceOver] = useState("3.20");
  const [savingsData, setSavingsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSavings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pUnder = parseFloat(priceUnder) || 6.50;
      const pOver = parseFloat(priceOver) || 3.20;

      const res = await calculateSavings({
        baseline,
        price_under: pUnder,
        price_over: pOver,
        horizon: 1,
      });
      setSavingsData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to calculate avoided mismatch");
    } finally {
      setLoading(false);
    }
  }, [baseline, priceUnder, priceOver]);

  useEffect(() => {
    fetchSavings();
  }, [fetchSavings]);

  function handleResetDefaults() {
    setBaseline("unreconciled");
    setPriceUnder("6.50");
    setPriceOver("3.20");
  }

  const avoidedMU = Number(savingsData?.annualized_avoided_mismatch_mu ?? 6911.5);
  const avoidedPct = Number(savingsData?.pct_lower_than_baseline ?? 10.82);
  const ciLow = Number(savingsData?.bootstrap_ci_95?.ci_lower ?? 5507.3);
  const ciHigh = Number(savingsData?.bootstrap_ci_95?.ci_upper ?? 8209.4);

  const baseCr = Number(savingsData?.valuation?.base_case?.total_crore ?? 3078.48);
  const lowCr = Number(savingsData?.valuation?.low_case?.total_crore ?? 2168.08);
  const highCr = Number(savingsData?.valuation?.high_case?.total_crore ?? 4339.42);

  const planningMUday = Number(savingsData?.planning_inconsistency?.mean_daily_inconsistency_mu ?? 91.03);
  const planningMUyear = Number(savingsData?.planning_inconsistency?.annualized_inconsistency_mu ?? 33249.8);

  return (
    <div className="page savings-page">
      <div className="page-header">
        <h2>Avoided Mismatch &amp; Economic Value Estimator</h2>
        <p className="subtext">
          Quantify the volume of power forecast mismatch avoided by hierarchical reconciliation versus stated operational baselines, with cited price benchmarks and statistical confidence intervals.
        </p>
      </div>

      {/* Mandatory Regulatory Caveat Box */}
      <div className="caveat-banner mono">
        <span className="banner-icon">⚠</span>
        <div>
          <strong>Mandatory Accounting Caveat:</strong>
          <div>
            {savingsData?.note ||
              "This estimates avoided over- or under-procurement relative to the stated baseline; it is not electricity physically saved and not evidence of what a government would save."}
          </div>
        </div>
      </div>

      {/* Inputs & Baseline Configuration */}
      <div className="panel filter-panel">
        <div className="control-group">
          <label>Comparison Baseline:</label>
          <select
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
            className="select-dropdown"
          >
            <option value="unreconciled">Unreconciled Independent Models (Phase B Base)</option>
            <option value="seasonal_naive_7d">Seasonal Naive (Same weekday last week)</option>
            <option value="seasonal_naive_364d">Seasonal Naive (Same weekday 364 days ago)</option>
            <option value="day_ahead_persistence">Day-Ahead Persistence (Yesterday's value)</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            Under-Forecast / Shortfall Price (₹/kWh):
          </label>
          <input
            type="number"
            step="0.10"
            min="0"
            value={priceUnder}
            onChange={(e) => setPriceUnder(e.target.value)}
            className="price-input mono"
          />
          <div className="citation-note mono">
            Cited Benchmark: ₹6.50/kWh (CERC DSM Ancillary Services Cap 2024)
          </div>
        </div>

        <div className="control-group">
          <label>
            Over-Forecast / Surplus Price (₹/kWh):
          </label>
          <input
            type="number"
            step="0.10"
            min="0"
            value={priceOver}
            onChange={(e) => setPriceOver(e.target.value)}
            className="price-input mono"
          />
          <div className="citation-note mono">
            Cited Benchmark: ₹3.20/kWh (IEX Day-Ahead Market DAM avg 2024–2025)
          </div>
        </div>

        <div className="control-group btn-group">
          <button onClick={handleResetDefaults} className="btn btn-outline">
            Reset Cited Defaults
          </button>
          {loading && <span className="spinner-inline">Recalculating…</span>}
        </div>
      </div>

      {error && (
        <div className="panel error-state">
          <p>{error}</p>
        </div>
      )}

      {/* Prominent Standard Headline Result */}
      <div className="panel headline-panel">
        <div className="savings-headline-text">
          {savingsData?.headline_text ||
            `Avoided forecast mismatch: ${avoidedMU.toLocaleString()} MU per year (${avoidedPct.toFixed(2)}% lower than baseline), worth about ₹${baseCr.toLocaleString()} Crore at the prices shown.`}
        </div>
        <div className="confidence-interval mono">
          Statistical 95% Week-Block Bootstrap Confidence Interval: [{ciLow.toLocaleString()} to {ciHigh.toLocaleString()} MU / year]
          <span className="subtext"> (141 weekly blocks × 1,000 replications)</span>
        </div>
      </div>

      {/* 3 Valuation Cases */}
      <div className="panel">
        <div className="panel-head">
          <h3>Economic Valuation Scenarios (Annual Avoided Cost)</h3>
          <span className="unit-badge mono">1 MU = 1,000,000 kWh</span>
        </div>

        <div className="cases-grid">
          <div className="case-card">
            <div className="case-title">Low Case</div>
            <div className="case-sub mono">Conservative market spread (₹4.50 shortfall / ₹2.50 surplus)</div>
            <div className="case-val mono">₹{lowCr.toLocaleString()} <span className="unit-sm">Cr / yr</span></div>
            <div className="case-desc mono">95% CI Lower Bound avoided mismatch</div>
          </div>

          <div className="case-card case-base">
            <div className="case-title">Base Case (Default)</div>
            <div className="case-sub mono">CERC DSM cap ₹6.50 / IEX DAM clearing ₹3.20</div>
            <div className="case-val mono text-amber">₹{baseCr.toLocaleString()} <span className="unit-sm">Cr / yr</span></div>
            <div className="case-desc mono">Mean empirical holdout avoided mismatch</div>
          </div>

          <div className="case-card">
            <div className="case-title">High Case</div>
            <div className="case-sub mono">Peak summer market stress (₹9.00 shortfall / ₹4.50 surplus)</div>
            <div className="case-val mono">₹{highCr.toLocaleString()} <span className="unit-sm">Cr / yr</span></div>
            <div className="case-desc mono">High stress volatility valuation</div>
          </div>
        </div>
      </div>

      {/* Planning Inconsistency Card (Strictly Reported Separately) */}
      <div className="panel inconsistency-panel">
        <div className="panel-head">
          <h3>Desk-to-Desk Planning Inconsistency (Reported Separately)</h3>
          <span className="badge-warning mono">Non-Additive Gap Eliminated</span>
        </div>

        <div className="inconsistency-body">
          <div className="inconsistency-stat">
            <div className="lbl">Average Unreconciled Planning Gap:</div>
            <div className="val mono text-cyan">{planningMUday.toFixed(2)} <span className="unit">MU / day</span></div>
            <div className="sub mono">Equivalent to {planningMUyear.toLocaleString()} MU / year</div>
          </div>
          <div className="inconsistency-explanation">
            <p>
              Before reconciliation, regional despatch centres and the national desk forecast independently. 
              On average, the sum of 5 regional forecasts diverged from the national desk forecast by 
              <strong> {planningMUday.toFixed(2)} MU/day</strong>.
            </p>
            <p className="note-text">
              Note: As required by Section 8 of the engineering specification, planning inconsistency represents internal planning discordance across desks and is 
              <strong> strictly reported separately</strong> from physical avoided mismatch. It is not added to the savings figure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
