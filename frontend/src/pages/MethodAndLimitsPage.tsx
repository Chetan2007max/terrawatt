import React from 'react';
import { Panel } from '../components/Panel/Panel';
import { HelpDrawer } from '../components/HelpDrawer/HelpDrawer';
import { Term } from '../components/Term/Term';
import { PAGE_COPY } from '../content/pageCopy';
import { BookOpen, ShieldAlert, Cpu, GitBranch, Database } from 'lucide-react';
import styles from './MethodAndLimitsPage.module.css';

export const MethodAndLimitsPage: React.FC = () => {
  const copy = PAGE_COPY['method'];

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1>{copy.title}</h1>
          <p className={styles.question}>{copy.question}</p>
        </div>
      </header>

      {/* Mathematical Formulations Panel */}
      <section className={styles.section}>
        <Panel
          title="1. Hierarchical Summing & MinTrace Reconciliation"
          subtitle="Mathematical formulation guaranteeing exact coherence across national, regional, and state demand"
        >
          <div className={styles.mathBlock}>
            <h4 className={styles.mathTitle}>The Summing Constraint Matrix (S)</h4>
            <p className={styles.mathText}>
              Let y_t in R^51 be the vector of all demand nodes at day t, and b_t in R^45 be the bottom-level states and bulk-consumers. Coherence requires:
            </p>
            <div className={styles.formulaBox}>
              <code>y_t = S · b_t</code>
            </div>
            <p className={styles.mathText}>
              where S is the structural summing matrix summing 45 bottom leaves into 5 regional totals, and 5 regions into 1 national total.
            </p>

            <h4 className={styles.mathTitle} style={{ marginTop: 'var(--space-4)' }}>MinTrace mint_shrink Reconciliation Formula</h4>
            <p className={styles.mathText}>
              Raw independent model predictions are projected onto the coherent subspace via the generalized least-squares projection:
            </p>
            <div className={styles.formulaBox}>
              <code>{"ỹ_t = S (Sᵀ W⁻¹ S)⁻¹ Sᵀ W⁻¹ ŷ_t"}</code>
            </div>
            <p className={styles.mathText}>
              where W is the Ledoit-Wolf shrinkage estimator of the error covariance matrix:
            </p>
            <div className={styles.formulaBox}>
              <code>{"W = λ diag(Ŵ) + (1 - λ) Ŵ"}</code>
            </div>
            <p className={styles.mathText}>
              Shrinkage intensity lambda in [0, 1] prevents matrix ill-conditioning while preserving cross-regional covariance structure.
            </p>
          </div>
        </Panel>
      </section>

      {/* Split-Conformal Calibration Panel */}
      <section className={styles.section} style={{ marginTop: 'var(--space-6)' }}>
        <Panel
          title="2. Non-Parametric Split-Conformal Prediction Bands"
          subtitle="Calibrated uncertainty intervals with finite-sample statistical coverage guarantee"
        >
          <div className={styles.mathBlock}>
            <p className={styles.mathText}>
              Rather than assuming Gaussian errors, conformal calibration computes non-conformity scores R_i = |y_i - ỹ_i| across out-of-fold validation residuals. For target miscoverage rate alpha (e.g. 10% for a 90% interval):
            </p>
            <div className={styles.formulaBox}>
              <code>{"q̂_{1-α} = Quantile({R₁, ..., Rₙ}, ⌈(n+1)(1-α)⌉ / n)"}</code>
            </div>
            <p className={styles.mathText}>
              The forecast interval for any horizon day is strictly bounded:
            </p>
            <div className={styles.formulaBox}>
              <code>{"C_{1-α}(x_{n+1}) = [ỹ_{n+1} - q̂_{1-α},  ỹ_{n+1} + q̂_{1-α}]"}</code>
            </div>
          </div>
        </Panel>
      </section>

      {/* Model Architecture & Features Panel */}
      <section className={styles.section} style={{ marginTop: 'var(--space-6)' }}>
        <div className={styles.twoColGrid}>
          <Panel title="3. Model Card & Feature Pipeline" subtitle="Direct LightGBM models trained on Grid-India reports">
            <ul className={styles.specList}>
              <li>
                <strong>Model Count:</strong> 51 individual LightGBM gradient boosted decision tree regressors.
              </li>
              <li>
                <strong>Target Formulation:</strong> Ratio-to-previous-week targets y_t / y_(t-7) to normalize non-stationary seasonal trend.
              </li>
              <li>
                <strong>Calendar Features:</strong> Fourier harmonic series for annual and weekly cycles, day-of-week indicators, and national holiday markers.
              </li>
              <li>
                <strong>Training Window:</strong> Reliable period starting from 31 March 2013 to 31 December 2023.
              </li>
              <li>
                <strong>Zero Leakage:</strong> Strictly frozen 20% holdout test window (983 days, 4 Jan 2024 to 12 Sep 2026).
              </li>
            </ul>
          </Panel>

          <Panel title="4. Operating Limits & Boundary Conditions" subtitle="System boundaries and proper analytical interpretation">
            <ul className={styles.specList}>
              <li>
                <strong className="text-signal">Demand Split, Not Power Flow:</strong> Shows energy demand allocation across accounting boundaries, not physical DC power flow or transmission line transfers.
              </li>
              <li>
                <strong>Synthetic <Term term="Other node">Other Nodes</Term>:</strong> Unmetered municipal variations and line losses are absorbed into synthetic Other nodes (e.g. <code>Other_WR</code>) to preserve mathematical coherence.
              </li>
              <li>
                <strong>Heuristic Alert Boundary:</strong> <Term term="stress indicator">Stress indicators</Term> are heuristic alerts based on historical percentiles, not real-time contingency dispatch commands.
              </li>
              <li>
                <strong>Daily Granularity:</strong> Models operate on daily aggregate Million Units (<Term term="MU">MU/day</Term>); sub-hourly 15-minute dispatch is not modelled.
              </li>
            </ul>
          </Panel>
        </div>
      </section>

      {/* Help Drawer */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <HelpDrawer
          plotted={copy.helpDrawer.plotted}
          howToRead={copy.helpDrawer.howToRead}
          caveat={copy.helpDrawer.caveat}
        />
      </div>
    </div>
  );
};

export default MethodAndLimitsPage;

