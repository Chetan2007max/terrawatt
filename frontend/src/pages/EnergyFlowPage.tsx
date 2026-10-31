import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowGraph } from '../features/flow-graph/FlowGraph';
import { NodeDetailPanel } from '../features/node-panel/NodeDetailPanel';
import { ReplayControl } from '../features/replay/ReplayControl';
import { SegmentedControl } from '../components/SegmentedControl';
import { HelpDrawer } from '../components/HelpDrawer/HelpDrawer';
import { PAGE_COPY } from '../content/pageCopy';
import { useUrlState } from '../lib/url-state';
import styles from './EnergyFlowPage.module.css';

export const EnergyFlowPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateUrlState } = useUrlState();
  const [selectedNode, setSelectedNode] = useState<string | null>(state.node || 'India');

  const copy = PAGE_COPY['energy-flow'];

  const handleModeChange = (newMode: 'reconciled' | 'unreconciled') => {
    updateUrlState({ mode: newMode });
  };

  const handleHorizonChange = (hStr: string) => {
    updateUrlState({ horizon: parseInt(hStr, 10) });
  };

  const handleDateChange = (newDate: string) => {
    updateUrlState({ date: newDate });
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNode(nodeId);
    updateUrlState({ node: nodeId });
  };

  const handleSimulateScenario = (nodeId: string) => {
    navigate(`/scenario?node=${encodeURIComponent(nodeId)}`);
  };

  const handleViewForecast = (nodeId: string) => {
    navigate(`/forecast?node=${encodeURIComponent(nodeId)}`);
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <div>
            <h1>{copy.title}</h1>
            <p className={styles.headerQuestion}>{copy.question}</p>
          </div>
          <div className={styles.headerControls}>
            <SegmentedControl<'reconciled' | 'unreconciled'>
              value={state.mode}
              onChange={handleModeChange}
              options={[
                { value: 'reconciled', label: 'Reconciled (Gap 0)' },
                { value: 'unreconciled', label: 'Unreconciled' },
              ]}
            />
            <SegmentedControl
              value={String(state.horizon)}
              onChange={handleHorizonChange}
              options={[
                { value: '1', label: '1-Day Ahead' },
                { value: '7', label: '7-Day' },
                { value: '14', label: '14-Day' },
              ]}
            />
          </div>
        </div>

        {/* Replay Scrubber */}
        <div style={{ marginTop: 'var(--space-3)' }}>
          <ReplayControl
            currentDate={state.date}
            onDateChange={handleDateChange}
          />
        </div>
      </header>

      {/* Main Flow Layout */}
      <div className={styles.flowLayout}>
        <div className={styles.graphContainer}>
          <FlowGraph
            mode={state.mode}
            selectedNodeId={selectedNode}
            onSelectNode={handleSelectNode}
          />
        </div>

        {selectedNode && (
          <div className={styles.sidePanelSlot}>
            <NodeDetailPanel
              nodeId={selectedNode}
              onClose={() => setSelectedNode(null)}
              onSimulateScenario={handleSimulateScenario}
              onViewForecast={handleViewForecast}
            />
          </div>
        )}
      </div>

      {/* "What am I looking at?" Drawer */}
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

export default EnergyFlowPage;

