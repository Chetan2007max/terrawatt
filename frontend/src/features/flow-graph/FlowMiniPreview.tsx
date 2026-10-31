import React, { useState } from 'react';
import styles from './FlowMiniPreview.module.css';

interface FlowRegion {
  id: string;
  name: string;
  code: string;
  color: string;
  demandMu: number;
  sharePct: number;
  states: string[];
}

const REGIONS: FlowRegion[] = [
  { id: 'NR', name: 'Northern Region', code: 'NR', color: 'var(--region-nr)', demandMu: 1741.2, sharePct: 32.7, states: ['Uttar Pradesh', 'Rajasthan', 'Punjab', 'Haryana'] },
  { id: 'WR', name: 'Western Region', code: 'WR', color: 'var(--region-wr)', demandMu: 1620.5, sharePct: 30.4, states: ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Chhattisgarh'] },
  { id: 'SR', name: 'Southern Region', code: 'SR', color: 'var(--region-sr)', demandMu: 1180.1, sharePct: 22.1, states: ['Tamil Nadu', 'Karnataka', 'Telangana', 'Andhra Pradesh'] },
  { id: 'ER', name: 'Eastern Region', code: 'ER', color: 'var(--region-er)', demandMu: 639.4, sharePct: 12.0, states: ['West Bengal', 'Bihar', 'Odisha', 'Jharkhand'] },
  { id: 'NER', name: 'North Eastern Region', code: 'NER', color: 'var(--region-ner)', demandMu: 149.0, sharePct: 2.8, states: ['Assam', 'Meghalaya', 'Tripura'] },
];

export const FlowMiniPreview: React.FC = () => {
  const [hoveredRegion, setHoveredRegion] = useState<FlowRegion | null>(null);
  const totalNationalMu = 5330.2;

  // Layout coordinates for SVG
  const width = 840;
  const height = 240;
  const leftX = 40;
  const col1X = 220;
  const col2X = 520;
  const col3X = 800;

  let yCursor = 30;
  const ribbonGaps = 8;
  const totalRibbonHeight = height - 60;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.preTitle}>Sankey Demand Flow Engine (Section 6 Preview)</span>
          <h4 className={styles.title}>All-India Demand Split & Coherence Verification</h4>
        </div>
        <div className={styles.badgeRow}>
          <span className={styles.coherenceBadge}>
            <span className={styles.greenDot} /> Adds up: gap 0.00 MU (Exact match)
          </span>
          <span className={styles.dateStamp}>14 Sep 2026</span>
        </div>
      </div>

      <div className={styles.svgWrapper}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={styles.svg}
          role="img"
          aria-label="Interactive Demand Flow Sankey Preview"
        >
          {/* Column 1: National Total Node */}
          <rect
            x={col1X - 24}
            y={30}
            width={24}
            height={totalRibbonHeight}
            className={styles.nodeRectNational}
            rx={3}
          />
          <text x={col1X - 32} y={130} className={styles.nodeLabelNational} textAnchor="end">
            India Total
          </text>
          <text x={col1X - 32} y={150} className={styles.nodeValueNational} textAnchor="end">
            5,330.2 MU
          </text>

          {/* Ribbons from National to 5 Regions */}
          {REGIONS.map((region) => {
            const ribbonHeight = Math.max(14, (region.demandMu / totalNationalMu) * totalRibbonHeight - ribbonGaps);
            const sourceY = yCursor;
            const targetY = yCursor;
            const currentY = yCursor;
            yCursor += ribbonHeight + ribbonGaps;

            const isHovered = hoveredRegion?.id === region.id;
            const isFaded = hoveredRegion !== null && !isHovered;

            // Cubic Bezier Ribbon Path
            const pathD = `
              M ${col1X} ${sourceY}
              C ${col1X + 130} ${sourceY}, ${col2X - 130} ${targetY}, ${col2X} ${targetY}
              v ${ribbonHeight}
              C ${col2X - 130} ${targetY + ribbonHeight}, ${col1X + 130} ${sourceY + ribbonHeight}, ${col1X} ${sourceY + ribbonHeight}
              Z
            `;

            return (
              <g
                key={region.id}
                className={styles.ribbonGroup}
                onMouseEnter={() => setHoveredRegion(region)}
                onMouseLeave={() => setHoveredRegion(null)}
                tabIndex={0}
                role="button"
                aria-label={`${region.name}: ${region.demandMu} MU (${region.sharePct}%)`}
              >
                {/* Flow Ribbon */}
                <path
                  d={pathD}
                  fill={region.color}
                  className={`${styles.ribbon} ${isHovered ? styles.ribbonActive : ''} ${isFaded ? styles.ribbonFaded : ''}`}
                />

                {/* Region Node Rect */}
                <rect
                  x={col2X}
                  y={currentY}
                  width={14}
                  height={ribbonHeight}
                  fill={region.color}
                  rx={2}
                  className={styles.nodeRect}
                />

                {/* Region Text Labels */}
                <text
                  x={col2X + 22}
                  y={currentY + ribbonHeight / 2 + 4}
                  className={styles.regionLabel}
                >
                  <tspan fontWeight="600">{region.code}</tspan>
                  <tspan fill="var(--slate)"> · {region.demandMu.toLocaleString('en-IN')} MU ({region.sharePct}%)</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredRegion ? (
        <div className={styles.infoStrip}>
          <span className={styles.infoDot} style={{ background: hoveredRegion.color }} />
          <strong>{hoveredRegion.name} ({hoveredRegion.code}):</strong>
          <span>{hoveredRegion.demandMu.toLocaleString('en-IN')} MU/day ({hoveredRegion.sharePct}% of India).</span>
          <span className={styles.stateList}>Top nodes: {hoveredRegion.states.join(', ')}.</span>
        </div>
      ) : (
        <div className={styles.infoStrip}>
          <span className={styles.hint}>Hover any regional demand stream above to inspect flow volume, share, and state breakdown.</span>
        </div>
      )}
    </div>
  );
};

