import React, { useState } from 'react';
import { Download, RefreshCw, SlidersHorizontal, Eye } from 'lucide-react';
import { TopBar } from '../components/TopBar/TopBar';
import { Button } from '../components/Button/Button';
import { Panel } from '../components/Panel/Panel';
import { Stat } from '../components/Stat/Stat';
import { Tabs } from '../components/Tabs/Tabs';
import { DataTable } from '../components/DataTable/DataTable';
import { Skeleton } from '../components/Skeleton/Skeleton';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { Term } from '../components/Term/Term';
import { SeverityBadge } from '../components/SeverityBadge/SeverityBadge';
import { Select } from '../components/Select/Select';
import { Input } from '../components/Input/Input';
import { Sparkline } from '../components/Sparkline/Sparkline';
import { HelpDrawer } from '../components/HelpDrawer/HelpDrawer';
import { SegmentedControl } from '../components/SegmentedControl';
import { Slider } from '../components/Slider';
import { PaletteSwatch } from '../components/PaletteSwatch';
import { FlowMiniPreview } from '../features/flow-graph/FlowMiniPreview';
import { formatNumber, formatDate } from '../lib/format';
import { calculateContrast, getWcagRating } from '../lib/contrast';
import styles from './StyleGuidePage.module.css';

export const StyleGuidePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'components';
  });
  const [selectedNode, setSelectedNode] = useState('India');
  const [shockVal, setShockVal] = useState('10');
  const [shockSlider, setShockSlider] = useState(10);
  const [horizon, setHorizon] = useState<'7d' | '14d' | '30d' | '90d'>('14d');
  const [reconcileMode, setReconcileMode] = useState<'reconciled' | 'unreconciled'>('reconciled');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('theme') === 'dark' ? 'dark' : 'light';
  });

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  }

  // Sample 14-day demand trend for India
  const sampleTrend = [
    5120, 5180, 5210, 5250, 5290, 5270, 5240, 5280, 5310, 5340, 5360, 5330, 5310, 5330.2,
  ];

  const sampleTableData = [
    { region: 'Northern region (NR)', forecast: 1741.9, actual: 1712.5, share: 32.6, status: 'watch' as const },
    { region: 'Western region (WR)', forecast: 1570.0, actual: 1568.2, share: 29.4, status: 'info' as const },
    { region: 'Southern region (SR)', forecast: 1342.9, actual: 1341.0, share: 25.2, status: 'info' as const },
    { region: 'Eastern region (ER)', forecast: 603.9, actual: 604.1, share: 11.3, status: 'info' as const },
    { region: 'North Eastern region (NER)', forecast: 71.5, actual: 70.8, share: 1.5, status: 'critical' as const },
  ];

  // Token definition list for automated contrast checking
  const tokenList = [
    { token: '--charcoal', hex: '#171717', bg: '#F4F4F9', role: 'Primary text on Ghost canvas (Light)' },
    { token: '--slate', hex: '#586F7C', bg: '#F4F4F9', role: 'Secondary text & borders (Light)' },
    { token: '--safety-blue', hex: '#0A5DA8', bg: '#F4F4F9', role: 'Primary buttons & links (Light)' },
    { token: '--turf-green', hex: '#04724D', bg: '#FFFFFF', role: 'Coherent status on white surface' },
    { token: '--signal-red', hex: '#A31C1B', bg: '#FFFFFF', role: 'Crimson critical state on white' },
    { token: '--charcoal', hex: '#171717', bg: '#B8DBD9', role: 'Charcoal text on Mist fill' },
    { token: '--charcoal', hex: '#171717', bg: '#FFD500', role: 'Charcoal text on High-Vis Yellow' },
    { token: '--electric-blue', hex: '#00A3FF', bg: '#171717', role: 'Electric Blue on Charcoal surface' },
    { token: '--ghost (inverted)', hex: '#F4F4F9', bg: '#06110C', role: 'Ghost White text on Forest Green canvas (Dark)' },
    { token: '--safety-blue (dark)', hex: '#38BDF8', bg: '#0E1A15', role: 'Electric sky on Forest surface (Dark)' },
    { token: '--turf-green (dark)', hex: '#10B981', bg: '#0E1A15', role: 'Emerald green on Forest surface (Dark)' },
  ];

  return (
    <div className={styles.page}>
      {/* 1. Production Top Bar (Section 3.3 Rule) */}
      <TopBar
        activePageId="overview"
        dataAsOfDate="2026-09-12"
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Internal Step 2 Banner */}
      <div className={styles.stepNotice}>
        <div className="container">
          <div className={styles.stepInner}>
            <span>
              <strong>Internal Style Guide (Step 2 of Section 11):</strong> Design tokens, IBM Plex typography, and component primitives.
            </span>
            <div className={styles.stepActions}>
              <button
                type="button"
                className={styles.themeToggle}
                onClick={toggleTheme}
                aria-label="Toggle light or dark theme"
              >
                Switch to {theme === 'light' ? 'Dark theme' : 'Light theme'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        {/* Page Header Block (Section 3.3 rule: title, one sentence question, then controls) */}
        <header className={styles.pageHeader}>
          <h1>TerraWatt v2 Component &amp; Token Primitives</h1>
          <p className={styles.headerQuestion}>
            How do our design tokens, fonts, and component primitives look and behave across responsive screens?
          </p>

          <div className={styles.controlsRow}>
            <Tabs
              activeId={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'components', label: 'Component Primitives' },
                { id: 'tokens', label: 'Automated Contrast Matrix' },
                { id: 'typography', label: 'Typography & Glossary' },
              ]}
            />

            <div className={styles.controlsRight}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={showTechnicalDetails}
                  onChange={(e) => setShowTechnicalDetails(e.target.checked)}
                />
                <Eye size={14} strokeWidth={1.5} />
                <span>Show technical details</span>
              </label>
            </div>
          </div>
        </header>

        {/* TAB 1: COMPONENTS */}
        {activeTab === 'components' && (
          <div className={styles.sectionStack}>
            {/* 0. Palette Swatch Strip */}
            <Panel
              title="1. Core Design Palette &amp; User Reference Swatches"
              subtitle="Direct reference to user swatches: Pure Black #000000, Forest Green #06110C, Deep Charcoal #171717, Slate #586F7C, Mist #B8DBD9, Ghost White #F4F4F9, Turf Green #04724D"
            >
              <PaletteSwatch />
            </Panel>

            {/* Stat Cards with Data Sentences & Sparklines */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>2. Stat Cards with Plain-Language Data Sentences</h3>
              <div className={styles.statGrid}>
                <Stat
                  label="National forecast"
                  value={formatNumber(5330.2)}
                  unit="MU"
                  date="14 Sep 2026"
                  sentence="Forecast for 14 Sep 2026: 5,330.2 MU. That is 3.1% above the same weekday last week."
                  trend={{ value: '3.1%', isPositive: true }}
                  sparkline={<Sparkline data={sampleTrend} width={84} height={26} />}
                />

                <Stat
                  label="Coherence gap"
                  value={formatNumber(0.0, 2)}
                  unit="MU"
                  date="Reconciled"
                  sentence="Regional sum exactly matches national total to within machine precision (< 10⁻¹² MU)."
                  badge={<span className={styles.exactBadge}>Exact match</span>}
                />

                <Stat
                  label="Hold-out accuracy"
                  value="2.09%"
                  unit="WAPE"
                  date="983 test days"
                  sentence="Weighted forecast error is 2.09% on the 983-day holdout test period."
                  trend={{ value: '0.4% vs baseline', isPositive: true }}
                />
              </div>
            </div>

            {/* Sankey Flow Miniature Preview (Section 6 Pre-validation) */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>3. Energy Flow Sankey Ribbon Geometry (Step 4 Preview)</h3>
              <FlowMiniPreview />
            </div>

            {/* Severity Indicators (Section 3.1: Info, Watch, Critical) */}
            <Panel title="4. Severity Indicators (Never Color-Only)" subtitle="Every status shows an icon, a word, and high-contrast styling per section 3.1">
              <div className={styles.badgeRow}>
                <SeverityBadge level="info" label="Info: System coherent" />
                <SeverityBadge level="watch" label="Watch: 92% peak capacity" />
                <SeverityBadge level="critical" label="Critical: Reserve margin below 5%" />
              </div>
            </Panel>

            {/* Segmented Controls & Sliders */}
            <Panel title="5. Engineering Controls (Segmented Toggles &amp; Shock Sliders)" subtitle="Keyboard-accessible controls for time horizons, reconciliation state, and stress shocks">
              <div className={styles.controlsDemoGrid}>
                <div className={styles.controlItem}>
                  <label className="text-xs text-slate" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                    Forecast Horizon Select
                  </label>
                  <SegmentedControl
                    value={horizon}
                    onChange={setHorizon}
                    options={[
                      { value: '7d', label: '7 Days' },
                      { value: '14d', label: '14 Days' },
                      { value: '30d', label: '30 Days' },
                      { value: '90d', label: '90 Days', badge: 'Quarter' },
                    ]}
                  />
                </div>

                <div className={styles.controlItem}>
                  <label className="text-xs text-slate" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                    Reconciliation Mode
                  </label>
                  <SegmentedControl
                    value={reconcileMode}
                    onChange={setReconcileMode}
                    options={[
                      { value: 'reconciled', label: 'Reconciled (Gap 0)' },
                      { value: 'unreconciled', label: 'Raw Bottom-up' },
                    ]}
                  />
                </div>

                <div className={styles.controlItemFull}>
                  <Slider
                    label="Interactive Demand Shock Simulation"
                    min={-30}
                    max={30}
                    step={1}
                    value={shockSlider}
                    onChange={setShockSlider}
                    unit="%"
                    helperText={`Simulating an equalized ${shockSlider > 0 ? '+' : ''}${shockSlider}% shock redistributed across all 51 nodes via KKT solver.`}
                    marks={[
                      { value: -30, label: '-30%' },
                      { value: -15, label: '-15%' },
                      { value: 0, label: '0%' },
                      { value: 10, label: '+10%' },
                      { value: 30, label: '+30%' },
                    ]}
                  />
                </div>
              </div>
            </Panel>

            {/* Custom Form Controls (Section 3.3 Rule: No default browser controls) */}
            <Panel title="6. Form Controls (Custom Keyboard-Accessible Primitives)" subtitle="Section 3.3 rule: clean controls with 1px border, 6px radius, hover states, and visible focus rings">
              <div className={styles.formRow}>
                <Select
                  label="Select Hierarchy Node"
                  value={selectedNode}
                  onChange={(e) => setSelectedNode(e.target.value)}
                  options={[
                    { value: 'India', label: 'India (National Total)' },
                    { value: 'NR', label: 'Northern region (NR)' },
                    { value: 'WR', label: 'Western region (WR)' },
                    { value: 'SR', label: 'Southern region (SR)' },
                    { value: 'ER', label: 'Eastern region (ER)' },
                    { value: 'NER', label: 'North Eastern region (NER)' },
                  ]}
                />

                <Input
                  label="Simulate Demand Shock"
                  type="number"
                  value={shockVal}
                  onChange={(e) => setShockVal(e.target.value)}
                  unitSuffix="%"
                  style={{ width: '120px' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label className="text-xs text-slate">Action Trigger</label>
                  <Button variant="primary" icon={<SlidersHorizontal size={14} strokeWidth={1.5} />}>
                    Apply scenario
                  </Button>
                </div>
              </div>
            </Panel>

            {/* Button Primitives */}
            <Panel title="7. Button Primitives" subtitle="Flat buttons with 1px border, 6px radius, no gradients, and visible focus rings">
              <div className={styles.buttonRow}>
                <Button variant="primary" icon={<Download size={16} strokeWidth={1.5} />}>
                  Download CSV
                </Button>
                <Button variant="secondary" icon={<RefreshCw size={16} strokeWidth={1.5} />}>
                  Reset inputs
                </Button>
                <Button variant="critical">
                  Trigger emergency shock
                </Button>
                <Button variant="ghost">
                  Dismiss
                </Button>
                <Button variant="primary" disabled>
                  Disabled state
                </Button>
              </div>
            </Panel>

            {/* Data Table Primitive */}
            <Panel
              title="8. Accessible Data Table"
              subtitle="Numbers right-aligned with tabular figures, slate unit suffixes, and subtle hover highlights"
              headerAction={
                <Button size="sm" variant="secondary" icon={<Download size={14} strokeWidth={1.5} />}>
                  Export table
                </Button>
              }
            >
              <DataTable
                keyExtractor={(row) => row.region}
                data={sampleTableData}
                columns={[
                  { key: 'region', header: 'Region name' },
                  { key: 'forecast', header: 'Forecast', isNumeric: true, unit: 'MU' },
                  { key: 'actual', header: 'Recent actual', isNumeric: true, unit: 'MU' },
                  { key: 'share', header: 'National share', isNumeric: true, unit: '%' },
                  {
                    key: 'status',
                    header: 'Operational state',
                    render: (row) => <SeverityBadge level={row.status} />,
                  },
                ]}
              />

              {/* Chart/Table Help Drawer (Section 5 Rule) */}
              <HelpDrawer
                plotted="Daily electricity demand forecast for India and five regions (MU/day)."
                howToRead="Numbers show electricity needed on the target day. The sum of five regions equals the national total."
                caveat="Statistical forecast based on historical weather and calendar patterns; not a real-time dispatch schedule."
              />
            </Panel>

            {/* Skeletons & Error State */}
            <div className={styles.twoCol}>
              <Panel title="9. Content-Shaped Skeleton Loader" subtitle="Respects prefers-reduced-motion without layout shifts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <Skeleton width="60%" height={24} />
                  <Skeleton width="100%" height={16} variant="text" />
                  <Skeleton width="90%" height={16} variant="text" />
                  <Skeleton width="100%" height={100} variant="rect" />
                </div>
              </Panel>

              <Panel title="10. Plain-Language Error State" subtitle="Clear message with actionable retry control">
                <ErrorState
                  title="Could not connect to national grid API"
                  message="The service at 127.0.0.1:8000 was unreachable. Check if the backend process is running."
                  onRetry={() => alert('Retry triggered')}
                />
              </Panel>
            </div>
          </div>
        )}

        {/* TAB 2: TOKENS & CONTRAST */}
        {activeTab === 'tokens' && (
          <div className={styles.sectionStack}>
            <Panel title="Automated WCAG 2.1 Contrast Audit" subtitle="Section 3.1: Contrast ratios computed with standard WCAG formula; checked live">
              <div className={styles.auditGrid}>
                {tokenList.map((item, idx) => {
                  const ratio = calculateContrast(item.hex, item.bg);
                  const rating = getWcagRating(ratio);
                  return (
                    <div key={idx} className={styles.auditCard}>
                      <div className={styles.auditColors}>
                        <span className={styles.auditBlock} style={{ backgroundColor: item.bg, border: '1px solid #CBD5E1' }}>
                          <span style={{ color: item.hex, fontWeight: 600 }}>Aa</span>
                        </span>
                        <div>
                          <div className={styles.auditToken}>{item.token}</div>
                          <div className="mono text-xs text-slate">{item.hex} on {item.bg}</div>
                        </div>
                      </div>
                      <div className={styles.auditMeta}>
                        <span className="text-xs text-slate">{item.role}</span>
                        <div className={styles.auditScore}>
                          <span className="tabular font-bold">{ratio}:1</span>
                          <span className={`${styles.badgeRating} ${rating.pass ? styles.pass : styles.fail}`}>
                            {rating.level}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Fixed Regional Color Map (Section 3.1)" subtitle="One fixed color per region used everywhere across charts, trees, and flow graph">
              <div className={styles.regionGrid}>
                <div className={styles.regionChip} style={{ borderLeft: '4px solid var(--region-nr)' }}>
                  <strong>Northern region (NR)</strong>
                  <span className="mono text-xs">#0A5DA8</span>
                </div>
                <div className={styles.regionChip} style={{ borderLeft: '4px solid var(--region-wr)' }}>
                  <strong>Western region (WR)</strong>
                  <span className="mono text-xs">#586F7C</span>
                </div>
                <div className={styles.regionChip} style={{ borderLeft: '4px solid var(--region-sr)' }}>
                  <strong>Southern region (SR)</strong>
                  <span className="mono text-xs">#04724D</span>
                </div>
                <div className={styles.regionChip} style={{ borderLeft: '4px solid var(--region-er)' }}>
                  <strong>Eastern region (ER)</strong>
                  <span className="mono text-xs">#B45309</span>
                </div>
                <div className={styles.regionChip} style={{ borderLeft: '4px solid var(--region-ner)' }}>
                  <strong>North Eastern region (NER)</strong>
                  <span className="mono text-xs">#6B21A8</span>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* TAB 3: TYPOGRAPHY & GLOSSARY */}
        {activeTab === 'typography' && (
          <div className={styles.sectionStack}>
            <Panel title="Typeface Hierarchy (IBM Plex Sans &amp; Mono)" subtitle="Scale: 12, 14, 16 (body), 20, 28, 40 px. Sentences in sentence case, no title-case exclamation buzzwords.">
              <div className={styles.typeStack}>
                <div className={styles.typeRow}>
                  <span className={styles.typeMeta}>Hero (40px)</span>
                  <h1>5,330.2 MU demand forecast</h1>
                </div>
                <div className={styles.typeRow}>
                  <span className={styles.typeMeta}>Heading 2 (28px)</span>
                  <h2>National electricity demand overview</h2>
                </div>
                <div className={styles.typeRow}>
                  <span className={styles.typeMeta}>Heading 3 (20px)</span>
                  <h3>Regional distribution and additivity gap</h3>
                </div>
                <div className={styles.typeRow}>
                  <span className={styles.typeMeta}>Body (16px)</span>
                  <p>
                    Electricity demand is compiled daily from Grid Controller of India reports. All regional forecasts are
                    adjusted with the MinTrace algorithm so state demand adds up to regional demand, and regional demand adds up
                    to national demand.
                  </p>
                </div>
                <div className={styles.typeRow}>
                  <span className={styles.typeMeta}>Tabular Numerics</span>
                  <div className="tabular" style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
                    1,741.9 <span className="unit-suffix">MU</span> | +29.4 <span className="unit-suffix">MU gap</span> | 2.09% <span className="unit-suffix">WAPE</span>
                  </div>
                </div>
                <div className={styles.typeRow}>
                  <span className={styles.typeMeta}>Code / Node IDs</span>
                  <div>
                    <span className="code-inline">India/NR/Delhi</span> • API: <span className="code-inline">/api/v1/forecast?node=India</span>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Integrated Plain-Language Glossary (Section 5)" subtitle="Hover or tap any underlined term to see its grade-8 definition">
              <p style={{ lineHeight: 1.8 }}>
                Every technical term is explained in plain language. For example: In national dispatch, demand is measured in{' '}
                <Term term="MU">MU</Term>. When desks predict independently, the raw numbers are unreconciled. We use a{' '}
                <Term term="reconciled">reconciled</Term> forecast to eliminate planning gaps. We also compute a{' '}
                <Term term="prediction range">prediction range</Term> based on out-of-fold validation, measure accuracy with{' '}
                <Term term="WAPE">WAPE</Term>, run rigorous <Term term="backtest">backtests</Term> over the{' '}
                <Term term="hold-out test">hold-out test</Term> partition, simulate what-if <Term term="scenario">scenarios</Term>,
                and monitor automated <Term term="stress indicator">stress indicators</Term> across all states, including the{' '}
                <Term term="Other node">Other node</Term>.
              </p>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
};
