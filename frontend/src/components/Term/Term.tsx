import React from 'react';
import { GLOSSARY } from '../../content/glossary';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './Term.module.css';

export interface TermProps {
  term: keyof typeof GLOSSARY | string;
  children?: React.ReactNode;
  overrideDefinition?: string;
}

export const Term: React.FC<TermProps> = ({ term, children, overrideDefinition }) => {
  const entry = GLOSSARY[term];
  const definition = overrideDefinition || entry?.definition || 'Technical grid telemetry term.';
  const title = entry?.term || term;

  const tooltipContent = (
    <div>
      <div className={styles.tooltipTitle}>{title}</div>
      <div className={styles.tooltipDef}>{definition}</div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top">
      <span className={styles.term} tabIndex={0} role="button" aria-label={`Explain term: ${title}`}>
        {children || term}
      </span>
    </Tooltip>
  );
};

