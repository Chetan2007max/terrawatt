export default function MethodAndLimitsPage() {
  return (
    <div className="page method-page">
      <div className="page-header">
        <h2>Methodology, Limitations &amp; Data Credits</h2>
        <p className="subtext">
          Transparent engineering documentation covering mathematical formulations, empirical boundaries, data sources, and strict regulatory limitations.
        </p>
      </div>

      {/* Data Source Credits */}
      <div className="panel">
        <div className="panel-head">
          <h3>1. Data Sources &amp; Governance Credits</h3>
          <span className="unit-badge mono">Public Telemetry</span>
        </div>
        <div className="doc-content">
          <p>
            TerraWatt v2 relies on operational electricity demand telemetry compiled from daily power supply position reports published by:
          </p>
          <ul className="doc-list">
            <li>
              <strong>Primary Authority:</strong> Grid Controller of India Limited (GRID-INDIA), formerly Power System Operation Corporation (POSOCO), National Load Despatch Centre (NLDC), New Delhi.
            </li>
            <li>
              <strong>Dataset Compiler:</strong> Curated and maintained by Robbie Andrew (Senior Researcher, CICERO Center for International Climate Research) at{" "}
              <a
                href="https://robbieandrew.github.io/india/data/POSOCO_data.csv"
                target="_blank"
                rel="noreferrer"
                className="text-cyan underline"
              >
                robbieandrew.github.io/india/data/POSOCO_data.csv
              </a>.
            </li>
            <li>
              <strong>Audit &amp; Filtering:</strong> Rows prior to 2013-03-31 are excluded due to multi-month missingness; Western Region state telemetry on 2015-01-19 and Assam on 2014-11-25 are cleaned per Decision 001. 4,914 reliable daily records (2013-03-31 to 2026-09-12).
            </li>
          </ul>
        </div>
      </div>

      {/* Mathematical & Architectural Methodology */}
      <div className="panel">
        <div className="panel-head">
          <h3>2. Engineering Methodology</h3>
          <span className="unit-badge mono">Phases A through E</span>
        </div>
        <div className="doc-content">
          <div className="method-step">
            <h4>A. Chronological 80/20 Partitioning (Zero Test Leakage)</h4>
            <p>
              Dates are split strictly along the chronological time axis: 80% train+validation (2013-03-31 to 2023-12-16) and 20% holdout test set (2024-01-04 to 2026-09-12). 
              An automated CI test proves zero date overlap between training and test sets.
            </p>
          </div>

          <div className="method-step">
            <h4>B. Multi-Horizon Direct LightGBM with Ratio Targets</h4>
            <p>
              To solve the problem where gradient boosted trees cannot extrapolate beyond training peaks, the model predicts the ratio of target demand to a 28-day trailing mean. 
              Features include Fourier harmonic calendar components, holiday calendars, festival proximity, and trailing demand statistics.
            </p>
          </div>

          <div className="method-step">
            <h4>C. Hierarchical MinTrace (mint_shrink) Coherence</h4>
            <p>
              Base predictions from 51 independent models are mathematically reconciled using the MinTrace algorithm with shrinkage covariance estimation:
              <br />
              <code className="mono block-code">ỹ = S (Sᵀ W⁻¹ S)⁻¹ Sᵀ W⁻¹ ŷ</code>
              where <em>S</em> is the 51×45 summing matrix and <em>W</em> is the shrinkage estimator of the base forecast error covariance matrix. 
              Linear aggregation constraints hold to within &lt; 10⁻¹² MU across all 14 horizons.
            </p>
          </div>

          <div className="method-step">
            <h4>D. Split-Conformal Prediction Intervals</h4>
            <p>
              Non-parametric 80% and 95% uncertainty intervals are calibrated directly on out-of-fold validation residuals, guaranteeing distribution-free coverage over future horizons without assuming Gaussian errors.
            </p>
          </div>

          <div className="method-step">
            <h4>E. Covariance-Aware What-If Allocation (KKT System)</h4>
            <p>
              When a user perturbs demand at any node, reallocation across the grid solves an equality-constrained quadratic program:
              <br />
              <code className="mono block-code">min ½ (y - y₀)ᵀ H (y - y₀)  subject to  C y = d</code>
              where <em>H = diag(1 / σᵢ²)</em> weights adjustments by historical error variances, protecting low-volatility regions from artificial distortion.
            </p>
          </div>
        </div>
      </div>

      {/* Limitations: What the System Cannot Do */}
      <div className="panel limit-panel">
        <div className="panel-head">
          <h3>3. System Limitations: What TerraWatt CANNOT Do</h3>
          <span className="badge-warning mono">Operational Boundaries</span>
        </div>
        <div className="doc-content">
          <ul className="doc-list text-limit">
            <li>
              <strong>No Sub-Hourly Dispatch Modeling:</strong> TerraWatt operates strictly on daily energy totals (MU/day). It does not model 15-minute time-block dispatch, intra-hour ramping margins, spinning reserve dispatch, or instantaneous grid frequency (50 Hz) deviations.
            </li>
            <li>
              <strong>No AC/DC Power-Flow or Network Constraints:</strong> Scenario engine redistributions are statistical projections based on historical covariance. They do not simulate bus admittance matrices, transmission thermal line limits, N-1 branch contingencies, or substation transformer ratings.
            </li>
            <li>
              <strong>Heuristic Indicators are Not Blackout Predictors:</strong> Stress indicators evaluate historical statistical percentiles (e.g. Demand &gt; monthly P99). They are not deterministic predictors of grid failure, equipment tripping, or load shedding.
            </li>
            <li>
              <strong>Commercial Avoided Mismatch is Not Audited Fiscal Savings:</strong> Avoided forecast mismatch represents statistical reduction in volumetric procurement error relative to a chosen mathematical baseline. It is not audited utility profit and does not represent cash savings for DISCOMs or state treasuries.
            </li>
          </ul>
        </div>
      </div>

      {/* Version Changelog */}
      <div className="panel">
        <div className="panel-head">
          <h3>4. System Architecture &amp; Changelog</h3>
          <span className="unit-badge mono">v2.0.0 Release</span>
        </div>
        <div className="table-responsive">
          <table className="data-table mono">
            <thead>
              <tr>
                <th>Version</th>
                <th>Phase</th>
                <th>Key Architectural Capabilities</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>v1.0.0</td>
                <td>Initial Prototype</td>
                <td>Day-ahead single model, unreconciled forecasts, static CSV lookup.</td>
                <td className="subtext">Deprecated</td>
              </tr>
              <tr>
                <td>v2.0.0</td>
                <td>Phase A</td>
                <td>Reproducible 80/20 chronological split, supply column data dictionary, Decisions 001-006.</td>
                <td className="text-cyan">Frozen &amp; Verified</td>
              </tr>
              <tr>
                <td>v2.0.0</td>
                <td>Phase B</td>
                <td>Direct multi-horizon LightGBM (1..14d), MinTrace reconciliation (&lt; 10⁻¹² MU), conformal intervals.</td>
                <td className="text-cyan">Frozen &amp; Verified</td>
              </tr>
              <tr>
                <td>v2.0.0</td>
                <td>Phase C</td>
                <td>Scenario engine with Proportional vs. Covariance-Aware KKT allocation, pinned nodes.</td>
                <td className="text-cyan">Frozen &amp; Verified</td>
              </tr>
              <tr>
                <td>v2.0.0</td>
                <td>Phase D</td>
                <td>Heuristic stress indicators (P99 demand, supply deficit, sample size gated shortages).</td>
                <td className="text-cyan">Frozen &amp; Verified</td>
              </tr>
              <tr>
                <td>v2.0.0</td>
                <td>Phase E</td>
                <td>Avoided mismatch estimator (6,911.5 MU/yr), 95% bootstrap CI, separate planning gap.</td>
                <td className="text-cyan">Frozen &amp; Verified</td>
              </tr>
              <tr>
                <td>v2.0.0</td>
                <td>Phase F</td>
                <td>Production FastAPI microservice with /api/v1 routes, request logging, preloaded artifacts.</td>
                <td className="text-cyan">Frozen &amp; Verified</td>
              </tr>
              <tr>
                <td>v2.0.0</td>
                <td>Phase G</td>
                <td>7-Page React control-room dashboard with live API integration and responsive telemetry.</td>
                <td className="text-cyan">Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

