import React from 'react';
import { X, SlidersHorizontal, TrendingUp, Info } from 'lucide-react';
import { getNodeInfo } from '../../content/nodeDescriptions';
import { formatNumber } from '../../lib/format';
import { Sparkline } from '../../components/Sparkline/Sparkline';
import { SeverityBadge } from '../../components/SeverityBadge/SeverityBadge';
import { Button } from '../../components/Button/Button';
import { Term } from '../../components/Term/Term';
import styles from './NodeDetailPanel.module.css';

export interface NodeDetailPanelProps {
  nodeId: string | null;
  onClose: () => void;
  onSimulateScenario?: (nodeId: string) => void;
  onViewForecast?: (nodeId: string) => void;
  className?: string;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  nodeId,
  onClose,
  onSimulateScenario,
  onViewForecast,
  className = '',
}) => {
  if (!nodeId) return null;

  const info = getNodeInfo(nodeId);

  // Representative synthetic metrics for side panel
  const dummyValue = nodeId === 'India' ? 5330.2 : nodeId.includes('NR') ? 512.4 : 648.2;
  const parentShare = nodeId === 'India' ? 100 : nodeId.split('/').length === 2 ? 32.7 : 38.2;
  const nationalShare = nodeId === 'India' ? 100 : nodeId.split('/').length === 2 ? 32.7 : 12.2;
  const percentile = 78;
  const sparklineData = [480, 492, 510, 505, 520, 515, 530, 525, 540, 535, 550, 542, 548, dummyValue];

  return (
    <aside className={`${styles.panel} ${className}`} aria-label={`Node details for ${info.name}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.levelBadge}>{info.level.toUpperCase()} NODE</span>
          <h3 className={styles.title}>{info.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Close node panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.body}>
        <p className={styles.description}>{info.description}</p>

        {/* Current Demand Value Block */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiRow}>
            <span className={styles.kpiLabel}>Forecast Demand</span>
            <span className={styles.dateStamp}>13 Sep 2026</span>
          </div>
          <div className={styles.valRow}>
            <span className={`${styles.value} tabular`}>{formatNumber(dummyValue, 1)}</span>
            <span className="unit-suffix"><Term term="MU">MU/day</Term></span>
          </div>
          <p className={styles.kpiSentence}>
            Forecast for {info.name} is {formatNumber(dummyValue, 1)} <Term term="MU">MU</Term>. That is {parentShare.toFixed(1)}% of its regional reported total.
          </p>
        </div>

        {/* Share and Distribution */}
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Parent Share</span>
            <strong className="tabular">{parentShare.toFixed(1)}%</strong>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>National Share</span>
            <strong className="tabular">{nationalShare.toFixed(1)}%</strong>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Historical Band</span>
            <strong className="tabular">P{percentile}</strong>
          </div>
        </div>

        {/* 90-Day Trend Sparkline */}
        <div className={styles.sparklineSection}>
          <div className={styles.sparklineHeader}>
            <span className={styles.sparklineLabel}>Recent Demand Trajectory</span>
            <span className={styles.sparklineRange}>Last 14 days</span>
          </div>
          <Sparkline data={sparklineData} width={280} height={42} stroke="var(--safety-blue)" />
        </div>

        {/* Stress Indicator Status */}
        <div className={styles.stressSection}>
          <span className={styles.stressLabel}><Term term="stress indicator">Stress Status</Term></span>
          <SeverityBadge
            level={percentile > 85 ? 'watch' : 'info'}
            label={percentile > 85 ? 'Watch: Elevated summer cooling load' : 'Info: Demand within expected historical range'}
          />
        </div>

        {/* Quick Action Triggers */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            icon={<SlidersHorizontal size={14} />}
            onClick={() => onSimulateScenario?.(nodeId)}
          >
            Simulate scenario on node
          </Button>
          <Button
            variant="secondary"
            icon={<TrendingUp size={14} />}
            onClick={() => onViewForecast?.(nodeId)}
          >
            View multi-horizon curve
          </Button>
        </div>
      </div>
    </aside>
  );
};
