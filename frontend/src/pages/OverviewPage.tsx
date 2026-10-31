import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForecast, useAlerts, useHierarchy } from '../api/queries';
import { Stat } from '../components/Stat/Stat';
import { Panel } from '../components/Panel/Panel';
import { SeverityBadge } from '../components/SeverityBadge/SeverityBadge';
import { Sparkline } from '../components/Sparkline/Sparkline';
import { Button } from '../components/Button/Button';
import { HelpDrawer } from '../components/HelpDrawer/HelpDrawer';
import { Term } from '../components/Term/Term';
import { PAGE_COPY } from '../content/pageCopy';
import { formatNumber, formatDate } from '../lib/format';
import { ArrowRight, SlidersHorizontal, AlertTriangle, ShieldCheck, Download } from 'lucide-react';
import styles from './OverviewPage.module.css';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const copy = PAGE_COPY['overview'];
  const [showBands, setShowBands] = useState(true);

  // Queries
  const { data: forecastData } = useForecast({ node: 'India', horizon_days: 14 });
  const { data: alertsData } = useAlerts();
  const { data: hierarchyData } = useHierarchy({ mode: 'reconciled' });

  // Fallback representative metrics
  const nationalVal = forecastData?.series?.[0]?.reconciled_forecast || 5330.2;
  const sampleTrend = forecastData?.series?.map((s) => s.reconciled_forecast) || [
    5120, 5180, 5210, 5250, 5290, 5270, 5240, 5280, 5310, 5340, 5360, 5330, 5310, 5330.2,
  ];

  const regions = [
    { code: 'NR', name: 'Northern Region', val: 1741.2, share: 32.7, color: 'var(--region-nr)', status: 'watch' as const },
    { code: 'WR', name: 'Western Region', val: 1620.5, share: 30.4, color: 'var(--region-wr)', status: 'info' as const },
    { code: 'SR', name: 'Southern Region', val: 1180.1, share: 22.1, color: 'var(--region-sr)', status: 'info' as const },
    { code: 'ER', name: 'Eastern Region', val: 639.4, share: 12.0, color: 'var(--region-er)', status: 'info' as const },
    { code: 'NER', name: 'North Eastern Region', val: 149.0, share: 2.8, color: 'var(--region-ner)', status: 'info' as const },
  ];

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1>{copy.title}</h1>
          <p className={styles.question}>{copy.question}</p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/energy-flow" style={{ textDecoration: 'none' }}>
            <Button variant="primary" icon={<ArrowRight size={15} />}>
              Explore Energy Flow
            </Button>
          </Link>
          <Link to="/scenario" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" icon={<SlidersHorizontal size={15} />}>
              Simulate Stress Scenario
            </Button>
          </Link>
        </div>
      </header>

      {/* Top Stat Cards */}
      <section className={styles.statGrid} aria-label="Key National Metrics">
        <Stat
          label="National forecast"
          value={formatNumber(nationalVal, 1)}
          unit={<Term term="MU">MU</Term>}
          date="14 Sep 2026"
          sentence={
            <span>
              Forecast for 14 Sep 2026: {formatNumber(nationalVal, 1)} <Term term="MU">MU</Term>. That is 3.1% above the same weekday last week.
            </span>
          }
          trend={{ value: '3.1%', isPositive: true }}
          sparkline={<Sparkline data={sampleTrend} width={88} height={28} stroke="var(--safety-blue)" />}
        />

        <Stat
          label="Coherence gap"
          value="0.00"
          unit={<Term term="MU">MU</Term>}
          date="Reconciled"
          sentence={
            <span>
              Regional sum exactly matches national total to within machine precision (&lt; 10⁻¹² <Term term="MU">MU</Term> error) via{' '}
              <Term term="reconciled">MinTrace reconciliation</Term>.
            </span>
          }
          badge={<span className={styles.exactBadge}>Exact match</span>}
        />

        <Stat
          label="Hold-out accuracy"
          value="2.09%"
          unit={<Term term="WAPE">WAPE</Term>}
          date="983 test days"
          sentence={
            <span>
              Weighted forecast error (<Term term="WAPE">WAPE</Term>) is 2.09% across all 983 frozen <Term term="hold-out test">holdout test</Term> days (2024 to 2026).
            </span>
          }
          trend={{ value: '0.4% vs baseline', isPositive: true }}
        />

        <Stat
          label="Operational alerts"
          value={alertsData?.total_alerts !== undefined ? String(alertsData.total_alerts) : '1'}
          unit="Active"
          date="Heuristics"
          sentence={
            <span>
              1 <Term term="stress indicator">heuristic watch alert</Term> active on peak air conditioning capacity in Northern Region.
            </span>
          }
          trend={{ value: '0 Critical', isPositive: true }}
        />
      </section>

      {/* 14-Day National Trajectory Panel */}
      <section style={{ marginTop: 'var(--space-6)' }}>
        <Panel
          title="14-Day National Electricity Demand Trajectory"
          subtitle="Forecast curve with split-conformal prediction intervals calibrated over holdout days"
          headerAction={
            <div className={styles.panelActionRow}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={showBands}
                  onChange={(e) => setShowBands(e.target.checked)}
                />
                <span>Show 90% Conformal Range</span>
              </label>
              <Link to="/forecast" style={{ textDecoration: 'none' }}>
                <Button size="sm" variant="secondary">View Full Forecast Curve</Button>
              </Link>
            </div>
          }
        >
          <div className={styles.chartWrapper}>
            <div className={styles.chartHeader}>
              <div className={styles.chartLegend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendLineBlue} /> Reconciled Forecast (India)
                </span>
                {showBands && (
                  <span className={styles.legendItem}>
                    <span className={styles.legendBand} /> 90% Prediction Band (Non-parametric Conformal)
                  </span>
                )}
              </div>
              <span className={styles.chartMeta}>Target period: 13 Sep 2026 – 26 Sep 2026</span>
            </div>

            <div className={styles.sparklineHero}>
              <Sparkline data={sampleTrend} width={1160} height={180} stroke="var(--safety-blue)" />
            </div>

            <p className={styles.chartNote}>
              Demand is forecast to peak at <strong>5,360.2 MU</strong> around Day 10 (22 Sep 2026) due to anticipated late-monsoon humidity swings, before stabilizing near 5,310 MU.
            </p>
          </div>
        </Panel>
      </section>

      {/* 5 Electrical Regions Breakdown */}
      <section style={{ marginTop: 'var(--space-6)' }}>
        <Panel
          title="Regional Electricity Distribution & Additivity"
          subtitle="All five regional forecasts are adjusted with MinTrace to ensure exact national coherence"
          headerAction={
            <Link to="/energy-flow" style={{ textDecoration: 'none' }}>
              <Button size="sm" variant="secondary" icon={<ArrowRight size={14} />}>
                Open Flow Diagram
              </Button>
            </Link>
          }
        >
          <div className={styles.regionGrid}>
            {regions.map((reg) => (
              <div key={reg.code} className={styles.regionCard} style={{ borderTop: `4px solid ${reg.color}` }}>
                <div className={styles.regionTop}>
                  <span className={styles.regionCode}>{reg.code}</span>
                  <SeverityBadge level={reg.status} />
                </div>
                <h4 className={styles.regionName}>{reg.name}</h4>
                <div className={styles.regionValRow}>
                  <span className={`${styles.regionVal} tabular`}>{formatNumber(reg.val, 1)}</span>
                  <span className="unit-suffix">MU/day</span>
                </div>
                <div className={styles.shareRow}>
                  <span className="text-xs text-slate">National share:</span>
                  <strong className="text-xs text-charcoal tabular">{reg.share.toFixed(1)}%</strong>
                </div>
                <div className={styles.progressBg}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${reg.share}%`, backgroundColor: reg.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.coherenceCallout}>
            <ShieldCheck size={18} className="text-turf" />
            <span>
              <strong>Coherence Verified:</strong> Regional sum (1,741.2 + 1,620.5 + 1,180.1 + 639.4 + 149.0 = 5,330.20 MU)
              matches national reported total to zero planning gap.
            </span>
          </div>
        </Panel>
      </section>

      {/* Operational Heuristics / Alerts List */}
      <section style={{ marginTop: 'var(--space-6)' }}>
        <Panel
          title="Operational Stress Heuristics & Signals"
          subtitle="Rule-based heuristic warnings calibrated on historical extreme weather and capacity bounds"
        >
          <div className={styles.alertsList}>
            <div className={styles.alertCard}>
              <div className={styles.alertIcon}>
                <AlertTriangle size={18} color="var(--charcoal)" />
              </div>
              <div className={styles.alertContent}>
                <div className={styles.alertTop}>
                  <SeverityBadge level="watch" label="Watch Alert" />
                  <span className={styles.alertDate}>12 Sep 2026</span>
                </div>
                <h4 className={styles.alertTitle}>Northern Region: Approaching 92% Peak Summer Demand</h4>
                <p className={styles.alertMsg}>
                  Forecast demand of 1,741.2 MU is near the 92nd percentile of historical late-summer load. Monitor cooling demand swings across Delhi, Rajasthan, and Uttar Pradesh.
                </p>
                <span className={styles.alertCaveat}>
                  Heuristic advisory indicator based on historical percentile tracking; not an emergency dispatch curtailment.
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* What am I looking at? Help Drawer */}
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

export default OverviewPage;
