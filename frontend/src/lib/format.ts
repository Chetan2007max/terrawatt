/**
 * Centralized formatting module for TerraWatt v2
 * Rule from section 3.2: Format numbers with Intl.NumberFormat('en-IN')
 * and dates like '12 Sep 2026'. One formatting module used everywhere.
 */

const inFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const inPrecisionFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const inIntegerFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

export function formatNumber(val: number | null | undefined, precision: number = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (precision === 0) return inIntegerFormatter.format(val);
  if (precision === 2) return inPrecisionFormatter.format(val);
  return inFormatter.format(val);
}

export function formatPercent(val: number | null | undefined, includeSign = false): string {
  if (val === null || val === undefined || isNaN(val)) return '—%';
  const formatted = `${inFormatter.format(Math.abs(val))}%`;
  if (includeSign) {
    if (val > 0) return `+${formatted}`;
    if (val < 0) return `-${formatted}`;
  }
  return formatted;
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const dt = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(dt.getTime())) return String(dateStr);
  const formatted = dt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }); // e.g. '12 Sep 2026'
  return formatted.replace('Sept', 'Sep');
}

export function formatUnit(val: number | null | undefined, unit: string = 'MU', precision: number = 1): string {
  if (val === null || val === undefined || isNaN(val)) return `— ${unit}`;
  return `${formatNumber(val, precision)} ${unit}`;
}

