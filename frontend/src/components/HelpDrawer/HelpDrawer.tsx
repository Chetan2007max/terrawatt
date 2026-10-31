import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './HelpDrawer.module.css';

export interface HelpDrawerProps {
  plotted: string;  // Line 1: What is plotted
  howToRead: string; // Line 2: How to read it
  caveat: string;    // Line 3: One caveat
  defaultOpen?: boolean;
  className?: string;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({
  plotted,
  howToRead,
  caveat,
  defaultOpen = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${styles.drawer} ${isOpen ? styles.open : ''} ${className}`}>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.btnContent}>
          <HelpCircle size={15} strokeWidth={1.5} className={styles.icon} />
          <span>What am I looking at?</span>
        </span>
        {isOpen ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
      </button>

      {isOpen && (
        <div className={styles.content}>
          <ul className={styles.list}>
            <li>
              <strong>What is plotted:</strong> {plotted}
            </li>
            <li>
              <strong>How to read it:</strong> {howToRead}
            </li>
            <li>
              <strong>Caveat:</strong> {caveat}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

