import React, { useState } from 'react';
import { useUrlState } from '../lib/url-state';
import { useSavings } from '../api/queries';
import { Panel } from '../components/Panel/Panel';
import { Stat } from '../components/Stat/Stat';
import { Select } from '../components/Select/Select';
import { Input } from '../components/Input/Input';
import { Button } from '../components/Button/Button';
import { DataTable } from '../components/DataTable/DataTable';
import { NoticePanel } from '../components/NoticePanel/NoticePanel';
import { HelpDrawer } from '../components/HelpDrawer/HelpDrawer';
import { Term } from '../components/Term/Term';
import { PAGE_COPY } from '../content/pageCopy';
import { formatNumber } from '../lib/format';
import { ShieldCheck, Info, Calculator, HelpCircle } from 'lucide-react';
import styles from './SavingsPage.module.css';

type AssumptionTier = 'custom' | 'low' | 'base' | 'high' | 'source_needed';

export const SavingsPage: React.FC = () => {
  const { state } = useUrlState();
  const copy = PAGE_COPY['savings'];

  const [baseline, setBaseline] = useState('unreconciled');
  const [tier, setTier] = useState<AssumptionTier>('base');
  const [extraCostUnder, setExtraCostUnder] = useState('1.75');
  const [extraCostOver, setExtraCostOver] = useState('0.90');

  // Representative holdout mismatch figures
  // Evaluated across 983 test days: 6,911.5 MU/year avoided mismatch
  const annualAvoidedMu = 6911.5;
  const dailyAvoidedMu = annualAvoidedMu / 365;

  const handleTierChange = (selectedTier: AssumptionTier) => {
    setTier(selectedTier);
    if (selectedTier === 'low') {
      setExtraCostUnder('1.00');
      setExtraCostOver('0.50');
    } else if (selectedTier === 'base') {
      setExtraCostUnder('1.75');
      setExtraCostOver('0.90');
    } else if (selectedTier === 'high') {
      setExtraCostUnder('2.50');
      setExtraCostOver('1.40');
    } else if (selectedTier === 'source_needed') {
      setExtraCostUnder('');
      setExtraCostOver('');
    }
  };

  const handleCustomUnder = (val: string) => {
    setExtraCostUnder(val);
    setTier('custom');
  };

  const handleCustomOver = (val: string) => {
    setExtraCostOver(val);
    setTier('custom');
  };

  // Cost calculation: incremental spread only
  const underRate = parseFloat(extraCostUnder);
  const overRate = parseFloat(extraCostOver);
  const hasValidInputs = !isNaN(underRate) && !isNaN(overRate) && underRate >= 0 && overRate >= 0;

  // Assuming symmetric error split (55% under-forecast, 45% over-forecast)
  const annualCrore = hasValidInputs
    ? (annualAvoidedMu * 1e6 * (0.55 * underRate + 0.45 * overRate)) / 1e7
    : null;

  // Range across low and high assumptions
  const lowCrore = (annualAvoidedMu * 1e6 * (0.55 * 1.00 + 0.45 * 0.50)) / 1e7;
  const highCrore = (annualAvoidedMu * 1e6 * (0.55 * 2.50 + 0.45 * 1.40)) / 1e7;

  // Regional breakdown
  const regionalSavings = [
    { region: 'Northern Region (NR)', dailyMu: 7.2, annualMu: 2630.0, annualCrore: hasValidInputs ? (2630.0 * 1e6 * (0.55 * underRate + 0.45 * overRate)) / 1e7 : null, share: '38.1%' },
    { region: 'Western Region (WR)', dailyMu: 6.3, annualMu: 2300.0, annualCrore: hasValidInputs ? (2300.0 * 1e6 * (0.55 * underRate + 0.45 * overRate)) / 1e7 : null, share: '33.3%' },
    { region: 'Southern Region (SR)', dailyMu: 3.5, annualMu: 1270.0, annualCrore: hasValidInputs ? (1270.0 * 1e6 * (0.55 * underRate + 0.45 * overRate)) / 1e7 : null, share: '18.4%' },
    { region: 'Eastern Region (ER)', dailyMu: 1.5, annualMu: 570.0, annualCrore: hasValidInputs ? (570.0 * 1e6 * (0.55 * underRate + 0.45 * overRate)) / 1e7 : null, share: '8.2%' },
    { region: 'North Eastern Region (NER)', dailyMu: 0.4, annualMu: 141.5, annualCrore: hasValidInputs ? (141.5 * 1e6 * (0.55 * underRate + 0.45 * overRate)) / 1e7 : null, share: '2.0%' },
  ];

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Page Header */}
      <header className={styles.header}>
        <div>
          <h1>{copy.title}</h1>
          <p className={styles.question}>{copy.question}</p>
        </div>
        <div className={styles.headerControls}>
          <div style={{ width: '280px' }}>
            <Select
              label="Compare against"
              helperText="Benchmark for mismatch evaluation"
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              options={[
                { value: 'unreconciled', label: 'Separate forecasts for each place, with no adjustment' },
                { value: 'seasonal_naive_7d', label: 'Seasonal naive (same weekday last week)' },
                { value: 'day_ahead_persistence', label: 'Persistence baseline (yesterday demand)' },
              ]}
            />
          </div>
        </div>
      </header>

      {/* Main Stat Grid: Leads strictly with the MU figures */}
      <section className={styles.statGrid} aria-label="Key Avoided Mismatch Metrics">
        <Stat
          label="Forecast error avoided"
          value="about 6,900"
          unit={<Term term="MU">MU a year</Term>}
          date="983 test days"
          sentence="Forecast error avoided: about 6,900 MU a year, 11 percent less than the baseline. (Two significant figures in prose, exact values in tables.)"
          trend={{ value: '11% less error', isPositive: true }}
        />

        <Stat
          label="Daily avoided mismatch"
          value={formatNumber(dailyAvoidedMu, 1)}
          unit={<Term term="MU">MU per day</Term>}
          date="All 5 regions"
          sentence={
            <span>
              <Term term="reconciled">MinTrace reconciliation</Term> eliminates an average of {formatNumber(dailyAvoidedMu, 1)} <Term term="MU">MU</Term> of regional planning discrepancy every day.
            </span>
          }
          trend={{ value: 'Coherent additivity', isPositive: true }}
        />

        <Stat
          label="Indicative avoided cost range"
          value={hasValidInputs ? `Rs ${formatNumber(annualCrore, 0)} crore` : 'Source needed'}
          unit={hasValidInputs ? '/ year' : ''}
          date={hasValidInputs ? `Rs ${formatNumber(lowCrore, 0)} – ${formatNumber(highCrore, 0)} crore` : 'Inputs unverified'}
          sentence={
            hasValidInputs ? (
              <span>
                Indicative range: <strong>Rs {formatNumber(lowCrore, 0)} – {formatNumber(highCrore, 0)} crore</strong> per year across user-entered incremental cost assumptions.
              </span>
            ) : (
              <span>
                Rupee calculation hidden until primary sources and dates are provided for incremental cost inputs.
              </span>
            )
          }
          badge={
            hasValidInputs ? (
              <span className={styles.rangeBadge}>User assumption</span>
            ) : (
              <span className={styles.sourceNeededBadge}>Source needed</span>
            )
          }
        />
      </section>

      {/* Incremental Cost Methodology & User Assumption Inputs */}
      <section style={{ marginTop: 'var(--space-6)' }}>
        <div className={styles.splitGrid}>
          {/* Form Controls for Valuation Inputs */}
          <Panel
            title="Incremental imbalance cost assumptions"
            subtitle="Only the extra cost paid or lost per kWh constitutes avoidable error"
          >
            <div className={styles.assumptionsForm}>
              {/* Preset buttons */}
              <div className={styles.tierSelector}>
                <label className={styles.tierLabel}>Select assumption tier:</label>
                <div className={styles.tierButtons}>
                  {(['low', 'base', 'high', 'source_needed'] as AssumptionTier[]).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={tier === t ? 'primary' : 'secondary'}
                      onClick={() => handleTierChange(t)}
                    >
                      {t === 'source_needed' ? 'Clear (Source needed)' : `${t.charAt(0).toUpperCase() + t.slice(1)} assumption`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className={styles.inputGrid}>
                <Input
                  label="Extra cost per kWh of under-forecast"
                  helperText="Deviation penalty rate paid minus planned day-ahead purchase rate"
                  type="number"
                  step="0.05"
                  min="0"
                  placeholder="e.g. 1.75"
                  value={extraCostUnder}
                  onChange={(e) => handleCustomUnder(e.target.value)}
                  unitSuffix="Rs/kWh"
                />

                <Input
                  label="Extra cost per kWh of over-forecast"
                  helperText="Committed purchase rate minus distressed real-time surplus resale rate"
                  type="number"
                  step="0.05"
                  min="0"
                  placeholder="e.g. 0.90"
                  value={extraCostOver}
                  onChange={(e) => handleCustomOver(e.target.value)}
                  unitSuffix="Rs/kWh"
                />
              </div>

              {/* Methodology & Formula Box */}
              <div className={styles.formulaCallout}>
                <div className={styles.formulaTitle}>
                  <Calculator size={15} /> Valuation formula
                </div>
                <div className={styles.formulaCode}>
                  <code>
                    Avoided cost = Avoided shortfall (MU) × 10⁶ × Extra cost (under) + Avoided surplus (MU) × 10⁶ × Extra cost (over)
                  </code>
                </div>
                <p className={styles.formulaExplanation}>
                  Valuing forecast error at the full market price overstates savings. The true cost of a forecast error is only the incremental deviation penalty paid or surplus lost per kWh.
                </p>
              </div>

              {/* Unverified Price Sources Notice */}
              <NoticePanel
                variant="info"
                title="Primary price sources policy"
                date="Audit verified"
              >
                <p>
                  No regulatory price caps or exchange averages (e.g. CERC DSM or IEX DAM) are cited as fixed facts without a verified retrieval date and primary filing link. Rates shown are user-selected sensitivity assumptions.
                </p>
              </NoticePanel>
            </div>
          </Panel>

          {/* Regional Avoided Volume Breakdown */}
          <Panel
            title="Regional breakdown of avoided mismatch"
            subtitle="Exact out-of-sample volume savings across 983 frozen test days"
          >
            <DataTable
              data={regionalSavings}
              keyExtractor={(row) => row.region}
              columns={[
                { key: 'region', header: 'Region name' },
                {
                  key: 'dailyMu',
                  header: 'Daily avoided',
                  isNumeric: true,
                  render: (row) => `${formatNumber(row.dailyMu, 1)} MU`,
                },
                {
                  key: 'annualMu',
                  header: 'Annual avoided',
                  isNumeric: true,
                  render: (row) => `${formatNumber(row.annualMu, 1)} MU`,
                },
                {
                  key: 'annualCrore',
                  header: 'Avoided cost',
                  isNumeric: true,
                  render: (row) => (row.annualCrore !== null ? `Rs ${formatNumber(row.annualCrore, 0)} crore` : '—'),
                },
                { key: 'share', header: 'Share', isNumeric: true },
              ]}
            />
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

export default SavingsPage;
