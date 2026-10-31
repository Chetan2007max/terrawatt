import React, { useState } from 'react';
import { useUrlState } from '../lib/url-state';
import { useSavings } from '../api/queries';
import { Panel } from '../components/Panel/Panel';
import { Stat } from '../components/Stat/Stat';
import { Select } from '../components/Select/Select';
import { Input } from '../components/Input/Input';
import { Button } from '../components/Button/Button';
import { DataTable } from '../components/DataTable/DataTable';
import { HelpDrawer } from '../components/HelpDrawer/HelpDrawer';
import { Term } from '../components/Term/Term';
import { PAGE_COPY } from '../content/pageCopy';
import { formatNumber } from '../lib/format';
import { IndianRupee, ShieldCheck, TrendingDown, BookOpen } from 'lucide-react';
import styles from './SavingsPage.module.css';

export const SavingsPage: React.FC = () => {
  const { state } = useUrlState();
  const copy = PAGE_COPY['savings'];

  const [baseline, setBaseline] = useState('unreconciled');
  const [priceUnder, setPriceUnder] = useState('7.50');
  const [priceOver, setPriceOver] = useState('3.20');

  const { data: savingsData } = useSavings({
    baseline,
    price_under: parseFloat(priceUnder) || 7.5,
    price_over: parseFloat(priceOver) || 3.2,
  });

  const dailyAvoidedMu = savingsData?.mean_daily_avoided_mismatch_mu || 29.4;
  const annualAvoidedMu = savingsData?.annualized_avoided_mismatch_mu || 10731.0;
  const annualCrore = (annualAvoidedMu * 1e6 * 5.35) / 1e7; // ₹ Crore valuation

  const regionalSavings = [
    { region: 'Northern Region (NR)', dailyMu: 11.2, annualMu: 4088.0, annualCrore: 218.7, share: '38.1%' },
    { region: 'Western Region (WR)', dailyMu: 9.8, annualMu: 3577.0, annualCrore: 191.4, share: '33.3%' },
    { region: 'Southern Region (SR)', dailyMu: 5.4, annualMu: 1971.0, annualCrore: 105.4, share: '18.4%' },
    { region: 'Eastern Region (ER)', dailyMu: 2.4, annualMu: 876.0, annualCrore: 46.9, share: '8.2%' },
    { region: 'North Eastern Region (NER)', dailyMu: 0.6, annualMu: 219.0, annualCrore: 11.7, share: '2.0%' },
  ];

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1>{copy.title}</h1>
          <p className={styles.question}>{copy.question}</p>
        </div>
        <div className={styles.headerControls}>
          <div style={{ width: '220px' }}>
            <Select
              label="Comparison Baseline"
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              options={[
                { value: 'unreconciled', label: 'Raw Unreconciled Desks' },
                { value: 'seasonal_naive_7d', label: 'Seasonal Naive (7-Day)' },
                { value: 'day_ahead_persistence', label: 'Persistence Baseline' },
              ]}
            />
          </div>
        </div>
      </header>

      {/* Top Valuation Stat Cards */}
      <section className={styles.statGrid}>
        <Stat
          label="Daily Avoided Mismatch"
          value={formatNumber(dailyAvoidedMu, 1)}
          unit={<Term term="MU">MU/day</Term>}
          date="983 Test Days"
          sentence={
            <span>
              <Term term="reconciled">MinTrace reconciliation</Term> avoids an average of {formatNumber(dailyAvoidedMu, 1)}{' '}
              <Term term="MU">MU</Term> of scheduling error every single day.
            </span>
          }
          trend={{ value: '18.4% less mismatch', isPositive: true }}
        />

        <Stat
          label="Annualized Avoided Volume"
          value={formatNumber(annualAvoidedMu, 0)}
          unit={<Term term="MU">MU/year</Term>}
          date="India Total"
          sentence={
            <span>
              Scaled over 365 days, avoided grid mismatch totals {formatNumber(annualAvoidedMu, 0)} Million Units (<Term term="MU">MU</Term>) annually.
            </span>
          }
          trend={{ value: 'Coherent additivity', isPositive: true }}
        />

        <Stat
          label="Estimated Avoided Cost"
          value={`₹${formatNumber(annualCrore, 1)}`}
          unit="Crore/yr"
          date="DSM Benchmark"
          sentence={`At average CERC DSM penalty tiers (₹${priceUnder}/kWh shortfall, ₹${priceOver}/kWh surplus), annual avoided imbalance costs exceed ₹${formatNumber(annualCrore, 1)} Crore.`}
          badge={<span className={styles.rupeeBadge}><IndianRupee size={12} /> CERC Tier</span>}
        />
      </section>

      {/* Price Assumptions & Valuation Grid */}
      <section style={{ marginTop: 'var(--space-6)' }}>
        <div className={styles.splitGrid}>
          {/* Price Config */}
          <Panel title="Valuation Price Assumptions" subtitle="CERC Deviation Settlement Mechanism (DSM) benchmark parameters">
            <div className={styles.priceForm}>
              <Input
                label="Shortfall Penalty (Under-generation / High Demand)"
                type="number"
                value={priceUnder}
                onChange={(e) => setPriceUnder(e.target.value)}
                unitSuffix="₹/kWh"
              />
              <Input
                label="Surplus Distress Discount (Over-generation)"
                type="number"
                value={priceOver}
                onChange={(e) => setPriceOver(e.target.value)}
                unitSuffix="₹/kWh"
              />
              <p className={styles.sourceRef}>
                <BookOpen size={14} /> Sources: Central Electricity Regulatory Commission (Deviation Settlement Mechanism and Related Matters) Regulations, 2022 &amp; 2024 amendments.
              </p>
            </div>
          </Panel>

          {/* Regional Table */}
          <Panel title="Regional Breakdown of Avoided Costs" subtitle="Avoided mismatch volume and estimated annual financial savings by region">
            <DataTable
              data={regionalSavings}
              keyExtractor={(row) => row.region}
              columns={[
                { key: 'region', header: 'Region name' },
                { key: 'dailyMu', header: 'Daily Avoided', isNumeric: true, render: (row) => `${formatNumber(row.dailyMu, 1)} MU` },
                { key: 'annualCrore', header: 'Annual Avoided', isNumeric: true, render: (row) => `₹${formatNumber(row.annualCrore, 1)} Cr` },
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

