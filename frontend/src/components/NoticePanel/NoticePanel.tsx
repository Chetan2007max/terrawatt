import React from 'react';
import { AlertTriangle, Info, AlertOctagon, CheckCircle2 } from 'lucide-react';
import styles from './NoticePanel.module.css';

export interface NoticePanelProps {
  variant?: 'warning' | 'info' | 'critical' | 'success';
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  date?: string;
  className?: string;
}

export const NoticePanel: React.FC<NoticePanelProps> = ({
  variant = 'warning',
  title,
  children,
  icon,
  badge,
  date,
  className = '',
}) => {
  const defaultIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertTriangle size={20} className={styles.iconWarning} />;
      case 'critical':
        return <AlertOctagon size={20} className={styles.iconCritical} />;
      case 'success':
        return <CheckCircle2 size={20} className={styles.iconSuccess} />;
      case 'info':
      default:
        return <Info size={20} className={styles.iconInfo} />;
    }
  };

  return (
    <div className={`${styles.noticePanel} ${styles[variant]} ${className}`} role="region" aria-label={title}>
      <div className={styles.iconSlot}>
        {icon || defaultIcon()}
      </div>
      <div className={styles.content}>
        <div className={styles.topRow}>
          <div className={styles.titleGroup}>
            <h4 className={styles.title}>{title}</h4>
            {badge && <span className={styles.badgeSlot}>{badge}</span>}
          </div>
          {date && <span className={styles.date}>{date}</span>}
        </div>
        <div className={styles.bodyText}>
          {children}
        </div>
      </div>
    </div>
  );
};
