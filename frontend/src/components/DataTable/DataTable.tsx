import React from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  isNumeric?: boolean;
  unit?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  keyExtractor: (row: T, index: number) => string | number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = 'No records available.',
  keyExtractor,
  className = '',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <div className={styles.emptyState}>{emptyMessage}</div>;
  }

  return (
    <div className={`${styles.tableWrapper} ${className}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${styles.th} ${col.isNumeric ? styles.numeric : ''}`}
              >
                <span>{col.header}</span>
                {col.unit && <span className={styles.headerUnit}>({col.unit})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={keyExtractor(row, index)} className={styles.tr}>
              {columns.map((col) => {
                const content = col.render
                  ? col.render(row)
                  : (row as Record<string, unknown>)[col.key] != null
                  ? String((row as Record<string, unknown>)[col.key])
                  : '—';

                return (
                  <td
                    key={col.key}
                    className={`${styles.td} ${col.isNumeric ? `${styles.numeric} tabular` : ''}`}
                  >
                    {content}
                    {col.unit && col.isNumeric && (
                      <span className="unit-suffix">{col.unit}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

