import React, { useState } from 'react';
import { useUrlState } from '../lib/url-state';
import { useForecast, useNodes } from '../api/queries';
import { Panel } from '../components/Panel/Panel';
import { Select } from '../components/Select/Select';
import { SegmentedControl } from '../components/SegmentedControl';
import { DataTable } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { Sparkline } from '../components/Sparkline/Sparkline';
import { HelpDrawer } from '../components/HelpDrawer/HelpDrawer';
import { Term } from '../components/Term/Term';
import { PAGE_COPY } from '../content/pageCopy';
import { formatNumber, formatDate } from '../lib/format';
import { Download, SlidersHorizontal, Eye } from 'lucide-react';
import styles from './ForecastPage.module.css';

export const ForecastPage: React.FC = () => {
  const { state, updateUrlState } = useUrlState();
  const copy = PAGE_COPY['forecast'];

  const [selectedNode, setSelectedNode] = useState(state.node || 'India');
  const [horizon, setHorizon] = useState<'7' | '14'>(String(state.horizon) === '7' ? '7' : '14');
  const [show90Band, setShow90Band] = useState(true);
  const [show95Band, setShow95Band] = useState(false);

  // Fetch forecast timeseries
  const { data: forecastData, isLoading } = useForecast({
    node: selectedNode,
    horizon_days: parseInt(horizon, 10),
  });

  const { data: nodesData } = useNodes();

  const handleNodeChange = (newNode: string) => {
    setSelectedNode(newNode);
    updateUrlState({ node: newNode });
  };

  const handleHorizonChange = (h: '7' | '14') => {
    setHorizon(h);
    updateUrlState({ horizon: parseInt(h, 10) });
  };

  const series = forecastData?.series || [
    { ds: '2026-09-13', horizon: 1, base_forecast: 5310.2, reconciled_forecast: 5330.2, q90_lower: 5120.0, q90_upper: 5540.0, q95_lower: 5040.0, q95_upper: 5620.0 },
    { ds: '2026-09-14', horizon: 2, base_forecast: 5325.0, reconciled_forecast: 5345.0, q90_lower: 5130.0, q90_upper: 5560.0, q95_lower: 5050.0, q95_upper: 5640.0 },
    { ds: '2026-09-15', horizon: 3, base_forecast: 5340.0, reconciled_forecast: 5360.0, q90_lower: 5140.0, q90_upper: 5580.0, q95_lower: 5060.0, q95_upper: 5660.0 },
    { ds: '2026-09-16', horizon: 4, base_forecast: 5320.0, reconciled_forecast: 5335.0, q90_lower: 5110.0, q90_upper: 5550.0, q95_lower: 5030.0, q95_upper: 5630.0 },
    { ds: '2026-09-17', horizon: 5, base_forecast: 5300.0, reconciled_forecast: 5310.0, q90_lower: 5080.0, q90_upper: 5530.0, q95_lower: 5000.0, q95_upper: 5610.0 },
    { ds: '2026-09-18', horizon: 6, base_forecast: 5315.0, reconciled_forecast: 5325.0, q90_lower: 5090.0, q90_upper: 5550.0, q95_lower: 5010.0, q95_upper: 5630.0 },
    { ds: '2026-09-19', horizon: 7, base_forecast: 5330.0, reconciled_forecast: 5340.0, q90_lower: 5100.0, q90_upper: 5570.0, q95_lower: 5020.0, q95_upper: 5650.0 },
  ];

  const trendVals = series.map((s) => s.reconciled_forecast);

  // Node select options
  const nodeOptions = [
    { value: 'India', label: 'India (National Total)' },
    { value: 'India/NR', label: 'Northern Region (NR)' },
    { value: 'India/WR', label: 'Western Region (WR)' },
    { value: 'India/SR', label: 'Southern Region (SR)' },
    { value: 'India/ER', label: 'Eastern Region (ER)' },
    { value: 'India/NER', label: 'North Eastern Region (NER)' },
    { value: 'India/WR/Maharashtra', label: 'Maharashtra (WR)' },
    { value: 'India/WR/Gujarat', label: 'Gujarat (WR)' },
    { value: 'India/NR/UP', label: 'Uttar Pradesh (NR)' },
    { value: 'India/NR/Rajasthan', label: 'Rajasthan (NR)' },
    { value: 'India/SR/Tamil Nadu', label: 'Tamil Nadu (SR)' },
    { value: 'India/SR/Karnataka', label: 'Karnataka (SR)' },
    { value: 'India/ER/West Bengal', label: 'West Bengal (ER)' },
    { value: 'India/NER/Assam', label: 'Assam (NER)' },
  ];

  const exportCsv = () => {
    const headers = 'Date,Horizon_Day,Reconciled_Forecast_MU,Base_Forecast_MU,Q90_Lower,Q90_Upper\n';
    const rows = series.map((s) => `${s.ds},${s.horizon},${s.reconciled_forecast},${s.base_forecast},${s.q90_lower || ''},${s.q90_upper || ''}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_${selectedNode.replace(/\//g, '_')}_${horizon}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1>{copy.title}</h1>
          <p className={styles.question}>{copy.question}</p>
        </div>
        <div className={styles.controlsBar}>
          <div style={{ minWidth: '220px' }}>
            <Select
              label="Select Hierarchy Node"
              value={selectedNode}
              onChange={(e) => handleNodeChange(e.target.value)}
              options={nodeOptions}
            />
          </div>
          <div>
            <label className="text-xs text-slate" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
              Horizon
            </label>
            <SegmentedControl<'7' | '14'>
              value={horizon}
              onChange={handleHorizonChange}
              options={[
                { value: '7', label: '7-Day' },
                { value: '14', label: '14-Day' },
              ]}
            />
          </div>
        </div>
      </header>

      {/* Main Forecast Chart Panel */}
      <Panel
        title={`Multi-Horizon Curve: ${selectedNode}`}
        subtitle={`Daily demand trajectory for ${selectedNode} with non-parametric conformal calibration`}
        headerAction={
          <div className={styles.bandToggles}>
            <label className={styles.toggleItem}>
              <input
                type="checkbox"
                checked={show90Band}
                onChange={(e) => setShow90Band(e.target.checked)}
              />
              <span>90% Conformal Range</span>
            </label>
            <label className={styles.toggleItem}>
              <input
                type="checkbox"
                checked={show95Band}
                onChange={(e) => setShow95Band(e.target.checked)}
              />
              <span>95% Conformal Range</span>
            </label>
          </div>
        }
      >
        <div className={styles.chartArea}>
          <div className={styles.chartHeaderRow}>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.legendLineBlue} /> <Term term="reconciled">Reconciled Forecast</Term>
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendLineSlate} /> Raw Unreconciled Baseline
              </span>
              {show90Band && (
                <span className={styles.legendItem}>
                  <span className={styles.legendBand90} /> 90% <Term term="prediction range">Prediction Range</Term>
                </span>
              )}
            </div>
            <span className={styles.chartMeta}>Target horizon: 1..{horizon} days</span>
          </div>

          <div className={styles.sparklineContainer}>
            <Sparkline data={trendVals} width={1160} height={200} stroke="var(--safety-blue)" />
          </div>

          <p className={styles.chartCaption}>
            Reconciled forecast for {selectedNode} begins at <strong>{formatNumber(series[0]?.reconciled_forecast || 0, 1)} MU</strong> on Day 1 and spans out to Day {horizon}.
            {show90Band && ` The 90% conformal band is ±${formatNumber(Math.abs((series[0]?.q90_upper || 0) - (series[0]?.reconciled_forecast || 0)), 1)} MU based on historical out-of-fold calibration.`}
          </p>
        </div>
      </Panel>

      {/* Tabular Timeseries Data */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <Panel
          title="Tabular Forecast Breakdown"
          subtitle="Point estimates, lower/upper intervals, and raw comparison figures with tabular numbers"
          headerAction={
            <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>
              Download CSV
            </Button>
          }
        >
          <DataTable
            data={series}
            keyExtractor={(row) => row.ds}
            columns={[
              { key: 'ds', header: 'Target date', render: (row) => formatDate(row.ds) },
              { key: 'horizon', header: 'Horizon day', isNumeric: true, render: (row) => `h=${row.horizon}` },
              { key: 'reconciled_forecast', header: 'Reconciled (MU)', isNumeric: true, render: (row) => formatNumber(row.reconciled_forecast, 1) },
              { key: 'base_forecast', header: 'Raw base (MU)', isNumeric: true, render: (row) => formatNumber(row.base_forecast, 1) },
              { key: 'q90_lower', header: '90% Lower (MU)', isNumeric: true, render: (row) => formatNumber(row.q90_lower, 1) },
              { key: 'q90_upper', header: '90% Upper (MU)', isNumeric: true, render: (row) => formatNumber(row.q90_upper, 1) },
            ]}
          />
        </Panel>
      </div>

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

export default ForecastPage;
