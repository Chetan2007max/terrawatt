/**
 * WCAG 2.1 Contrast & Relative Luminance Calculator
 * Computes exact contrast ratios per W3C specifications.
 */

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrast(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Number(ratio.toFixed(2));
}

export function getWcagRating(ratio: number, isLargeText = false): {
  level: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  pass: boolean;
} {
  if (isLargeText) {
    if (ratio >= 4.5) return { level: 'AAA', pass: true };
    if (ratio >= 3.0) return { level: 'AA', pass: true };
    return { level: 'Fail', pass: false };
  }
  if (ratio >= 7.0) return { level: 'AAA', pass: true };
  if (ratio >= 4.5) return { level: 'AA', pass: true };
  if (ratio >= 3.0) return { level: 'AA Large', pass: false };
  return { level: 'Fail', pass: false };
}

