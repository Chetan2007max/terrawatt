import React from 'react';
import styles from './Stat.module.css';

export interface StatProps {
  label: React.ReactNode;
  value: string | number;
  unit?: React.ReactNode;
  sentence?: React.ReactNode; // Plain-language sentence below the number (section 4 rule)
  date?: string;     // 'Data as of' stamp or date
  badge?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  sparkline?: React.ReactNode;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  unit,
  sentence,
  date,
  badge,
  trend,
  sparkline,
  className = '',
}) => {
  return (
    <div className={`${styles.statCard} ${className}`}>
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        {date && <span className={styles.date}>{date}</span>}
      </div>
      <div className={styles.valueRow}>
        <div className={styles.valueGroup}>
          <span className={`${styles.value} tabular`}>{value}</span>
          {unit && <span className={styles.unit}>{unit}</span>}
          {badge && <span className={styles.badgeSlot}>{badge}</span>}
          {trend && (
            <span className={`${styles.trend} ${trend.isPositive ? styles.trendPos : styles.trendNeg}`}>
              {trend.isPositive ? '↑ ' : '↓ '}
              {trend.value.replace(/^[+-]/, '')}
            </span>
          )}
        </div>
        {sparkline && <div className={styles.sparklineSlot}>{sparkline}</div>}
      </div>
      {sentence && <p className={styles.sentence}>{sentence}</p>}
    </div>
  );
};
