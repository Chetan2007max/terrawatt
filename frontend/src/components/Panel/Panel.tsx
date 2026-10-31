import React from 'react';
import styles from './Panel.module.css';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  borderVariant?: 'default' | 'highlight' | 'subtle';
}

export const Panel: React.FC<PanelProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  borderVariant = 'default',
  className = '',
  ...props
}) => {
  return (
    <section className={`${styles.panel} ${styles[borderVariant]} ${className}`} {...props}>
      {(title || subtitle || headerAction) && (
        <header className={styles.header}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {headerAction && <div className={styles.action}>{headerAction}</div>}
        </header>
      )}
      <div className={styles.content}>{children}</div>
    </section>
  );
};

