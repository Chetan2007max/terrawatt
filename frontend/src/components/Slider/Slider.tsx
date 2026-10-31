import React from 'react';
import styles from './Slider.module.css';

export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  marks?: { value: number; label: string }[];
  helperText?: string;
  id?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '%',
  marks,
  helperText,
  id,
}) => {
  const inputId = id || `slider-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <span className={styles.valueReadout}>
          <strong className="tabular">{value > 0 ? `+${value}` : value}</strong>
          <span className="unit-suffix">{unit}</span>
        </span>
      </div>

      <div className={styles.trackContainer}>
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.rangeInput}
          style={{
            background: `linear-gradient(to right, var(--mist) 0%, var(--safety-blue) ${percentage}%, rgba(88, 111, 124, 0.2) ${percentage}%, rgba(88, 111, 124, 0.2) 100%)`
          }}
        />
      </div>

      {marks && marks.length > 0 && (
        <div className={styles.marksContainer}>
          {marks.map((mark) => {
            const markPos = ((mark.value - min) / (max - min)) * 100;
            return (
              <button
                key={mark.value}
                type="button"
                className={`${styles.markBtn} ${mark.value === value ? styles.markActive : ''}`}
                style={{ left: `${markPos}%` }}
                onClick={() => onChange(mark.value)}
              >
                {mark.label}
              </button>
            );
          })}
        </div>
      )}

      {helperText && <p className={styles.helperText}>{helperText}</p>}
    </div>
  );
};

