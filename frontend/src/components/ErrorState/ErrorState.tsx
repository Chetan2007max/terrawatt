import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`${styles.errorBox} ${className}`} role="alert">
      <div className={styles.iconWrapper}>
        <AlertCircle size={20} strokeWidth={1.5} color="var(--signal-red)" />
      </div>
      <div className={styles.textWrapper}>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.message}>{message}</p>
        {onRetry && (
          <div className={styles.action}>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} strokeWidth={1.5} />}
              onClick={onRetry}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

