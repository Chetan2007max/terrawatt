import React from 'react';
import styles from './Logo.module.css';

export interface LogoProps {
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark'; // on dark top bar or light page
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  showWordmark = true,
  size = 'md',
  variant = 'light',
  className = '',
}) => {
  return (
    <div className={`${styles.wrapper} ${styles[size]} ${styles[variant]} ${className}`}>
      {/* Bespoke 3-Connected-Nodes SVG Mark (Section 3.3) */}
      <svg
        className={styles.mark}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Connecting Edges */}
        <line x1="12" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" />
        <line x1="12" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" />
        <line x1="6" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />

        {/* Top Parent Node (India) */}
        <circle cx="12" cy="6" r="3" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
        {/* Left Child Node (e.g. Region A) */}
        <circle cx="6" cy="18" r="2.5" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
        {/* Right Child Node (e.g. Region B) */}
        <circle cx="18" cy="18" r="2.5" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {showWordmark && (
        <span className={styles.wordmark}>
          TerraWatt <span className={styles.version}>v2</span>
        </span>
      )}
    </div>
  );
};

