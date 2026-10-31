import React from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, className = '' }) => {
  return (
    <div className={`${styles.tabList} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`${styles.count} tabular`}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

