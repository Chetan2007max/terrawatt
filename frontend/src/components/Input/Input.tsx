import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  unitSuffix?: string;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  unitSuffix,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputContainer} ${error ? styles.hasError : ''}`}>
        <input id={inputId} className={styles.input} {...props} />
        {unitSuffix && <span className={styles.unitSuffix}>{unitSuffix}</span>}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

