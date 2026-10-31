import React, { useState } from 'react';
import styles from './PaletteSwatch.module.css';

export interface SwatchItem {
  name: string;
  hex: string;
  role: string;
  isLight?: boolean;
}

export const PALETTE_SWATCHES: SwatchItem[] = [
  { name: 'Pure Black', hex: '#000000', role: 'High-contrast accents & dark terminal elements' },
  { name: 'Deep Forest', hex: '#06110C', role: 'Dark mode foundation (User swatch)' },
  { name: 'Deep Charcoal', hex: '#171717', role: 'Light mode text, top chrome, dark surfaces' },
  { name: 'Blue Slate', hex: '#586F7C', role: 'Secondary text, borders, axis lines, WR region' },
  { name: 'Light Blue / Mist', hex: '#B8DBD9', role: 'Row selection, hover states, confidence bands', isLight: true },
  { name: 'Ghost White', hex: '#F4F4F9', role: 'Clean page canvas (Default light)', isLight: true },
  { name: 'Turf Green', hex: '#04724D', role: 'Reconciled zero gap, positive trends, SR region' },
  { name: 'Safety Blue', hex: '#0A5DA8', role: 'Primary buttons, links, active states, NR region' },
  { name: 'Electric Blue', hex: '#00A3FF', role: 'Flow animation sparks, high-contrast highlights' },
  { name: 'Hi-Vis Yellow', hex: '#FFD500', role: 'Watch alerts (with 1px charcoal border)', isLight: true },
  { name: 'Crimson Red', hex: '#A31C1B', role: 'Critical alerts, drop shocks, reserve breach' },
];

export const PaletteSwatch: React.FC = () => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopy = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.strip}>
        {PALETTE_SWATCHES.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            className={styles.swatchCard}
            onClick={() => handleCopy(swatch.hex)}
            title={`Click to copy ${swatch.hex}`}
          >
            <div
              className={styles.colorBlock}
              style={{
                backgroundColor: swatch.hex,
                border: swatch.isLight ? '1px solid rgba(88, 111, 124, 0.3)' : 'none',
              }}
            >
              {copiedHex === swatch.hex && (
                <span className={styles.copiedBadge}>Copied!</span>
              )}
            </div>
            <div className={styles.meta}>
              <strong className={styles.hexCode}>{swatch.hex}</strong>
              <span className={styles.swatchName}>{swatch.name}</span>
              <span className={styles.swatchRole}>{swatch.role}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

