import React from 'react';
import { Check } from 'lucide-react';
import styles from './Checkbox.module.css';

export interface CheckboxProps {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  helperText,
  disabled = false,
  id,
  className = '',
}) => {
  const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div className={`${styles.wrapper} ${disabled ? styles.disabled : ''} ${className}`}>
      <label htmlFor={checkboxId} className={styles.labelRow}>
        <div className={styles.checkboxBoxSlot}>
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className={styles.nativeInput}
            onKeyDown={handleKeyDown}
          />
          <div className={`${styles.customBox} ${checked ? styles.checked : ''}`} aria-hidden="true">
            {checked && <Check size={13} strokeWidth={3} className={styles.checkIcon} />}
          </div>
        </div>
        <span className={styles.labelText}>{label}</span>
      </label>
      {helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
};
