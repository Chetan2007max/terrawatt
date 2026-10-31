import React from 'react';
import { Logo } from '../Logo/Logo';
import { formatDate } from '../../lib/format';
import { Sun, Moon, Activity } from 'lucide-react';
import styles from './TopBar.module.css';

export interface TopBarProps {
  activePageId?: string;
  onPageSelect?: (pageId: string) => void;
  dataAsOfDate?: string;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  className?: string;
}

export const PAGES = [
  { id: 'overview', label: 'Overview' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'energy-flow', label: 'Energy Flow' },
  { id: 'scenario', label: 'Scenario' },
  { id: 'backtest', label: 'Backtest' },
  { id: 'savings', label: 'Savings' },
  { id: 'method', label: 'Method & limits' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activePageId = 'overview',
  onPageSelect,
  dataAsOfDate = '2026-09-12',
  theme = 'light',
  onThemeToggle,
  className = '',
}) => {
  return (
    <header className={`${styles.topBar} ${className}`} role="banner">
      <div className="container">
        <div className={styles.inner}>
          <div className={styles.left}>
            <Logo size="md" variant="light" />
          </div>

          <nav className={styles.nav} aria-label="Main Navigation">
            {PAGES.map((page) => {
              const isActive = page.id === activePageId;
              return (
                <button
                  key={page.id}
                  className={`${styles.navLink} ${isActive ? styles.navActive : ''}`}
                  onClick={() => onPageSelect?.(page.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {page.label}
                </button>
              );
            })}
          </nav>

          <div className={styles.right}>
            <span className={styles.dataAsOf}>
              Data as of <strong className="tabular">{formatDate(dataAsOfDate)}</strong>
            </span>

            {onThemeToggle && (
              <button
                type="button"
                onClick={onThemeToggle}
                className={styles.themeToggle}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                <span className={styles.themeLabel}>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
