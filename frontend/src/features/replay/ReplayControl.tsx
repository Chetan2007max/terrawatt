import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward } from 'lucide-react';
import { formatDate } from '../../lib/format';
import styles from './ReplayControl.module.css';

export interface ReplayControlProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  availableDates?: string[];
  className?: string;
}

// 14 representative holdout test dates
const DEFAULT_HOLDOUT_DATES = [
  '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03',
  '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08',
  '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'
];

export const ReplayControl: React.FC<ReplayControlProps> = ({
  currentDate,
  onDateChange,
  availableDates = DEFAULT_HOLDOUT_DATES,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);

  const currentIndex = Math.max(0, availableDates.indexOf(currentDate));

  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 1200 / speed;
    const timer = setInterval(() => {
      onDateChange((prev) => {
        const idx = availableDates.indexOf(prev);
        if (idx >= availableDates.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return availableDates[idx + 1];
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, availableDates, onDateChange]);

  const stepBack = () => {
    if (currentIndex > 0) {
      onDateChange(availableDates[currentIndex - 1]);
    }
  };

  const stepForward = () => {
    if (currentIndex < availableDates.length - 1) {
      onDateChange(availableDates[currentIndex + 1]);
    }
  };

  const cycleSpeed = () => {
    setSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : 1));
  };

  return (
    <div className={`${styles.container} ${className}`} role="region" aria-label="Replay controls">
      <div className={styles.controlsRow}>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={stepBack}
            disabled={currentIndex === 0}
            className={styles.iconBtn}
            title="Step back one day"
            aria-label="Step back one day"
          >
            <SkipBack size={15} />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`${styles.iconBtn} ${styles.playBtn}`}
            title={isPlaying ? 'Pause replay' : 'Play chronological replay'}
            aria-label={isPlaying ? 'Pause replay' : 'Play chronological replay'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>

          <button
            type="button"
            onClick={stepForward}
            disabled={currentIndex === availableDates.length - 1}
            className={styles.iconBtn}
            title="Step forward one day"
            aria-label="Step forward one day"
          >
            <SkipForward size={15} />
          </button>

          <button
            type="button"
            onClick={cycleSpeed}
            className={styles.speedBtn}
            title="Toggle playback speed"
            aria-label={`Playback speed: ${speed}x`}
          >
            <span className="tabular">{speed}x</span>
          </button>
        </div>

        <div className={styles.dateDisplay}>
          <span className={styles.dateLabel}>Hold-out Replay Day:</span>
          <strong className="tabular">{formatDate(currentDate)}</strong>
          <span className={styles.stepCounter}>
            ({currentIndex + 1} of {availableDates.length})
          </span>
        </div>
      </div>

      <div className={styles.scrubberRow}>
        <input
          type="range"
          min={0}
          max={availableDates.length - 1}
          value={currentIndex}
          onChange={(e) => onDateChange(availableDates[Number(e.target.value)])}
          className={styles.scrubber}
          aria-label="Replay timeline scrubber"
        />
      </div>
    </div>
  );
};

