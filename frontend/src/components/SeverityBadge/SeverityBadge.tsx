import React from 'react';
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import styles from './SeverityBadge.module.css';

export type SeverityLevel = 'info' | 'watch' | 'critical';

export interface SeverityBadgeProps {
  level: SeverityLevel;
  label?: string;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ level, label, className = '' }) => {
  const config = {
    info: {
      defaultLabel: 'Info',
      icon: <Info size={14} strokeWidth={1.5} />,
    },
    watch: {
      defaultLabel: 'Watch',
      icon: <AlertTriangle size={14} strokeWidth={1.5} />,
    },
    critical: {
      defaultLabel: 'Critical',
      icon: <AlertOctagon size={14} strokeWidth={1.5} />,
    },
  }[level];

  return (
    <span className={`${styles.badge} ${styles[level]} ${className}`}>
      <span className={styles.icon}>{config.icon}</span>
      <span className={styles.text}>{label || config.defaultLabel}</span>
    </span>
  );
};

