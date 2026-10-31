import React from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel = 'Segmented options',
  className = '',
}: SegmentedControlProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`${styles.container} ${styles[size]} ${className}`}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`${styles.segment} ${isSelected ? styles.selected : ''}`}
          >
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span className={styles.badge}>{opt.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

