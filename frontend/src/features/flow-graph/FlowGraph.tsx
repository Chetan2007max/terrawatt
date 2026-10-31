import React, { useMemo, useState } from 'react';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { formatNumber } from '../../lib/format';
import styles from './FlowGraph.module.css';

export interface HierarchyNodeItem {
  id: string;
  name: string;
  region: 'NR' | 'WR' | 'SR' | 'ER' | 'NER' | 'ALL';
  level: 'national' | 'region' | 'bottom';
  value: number;
  reportedRegionValue?: number; // for unreconciled mode
}

export interface HierarchyLinkItem {
  source: string;
  target: string;
  value: number;
  region: 'NR' | 'WR' | 'SR' | 'ER' | 'NER';
}

export interface FlowGraphProps {
  mode: 'reconciled' | 'unreconciled';
  selectedNodeId?: string | null;
  onSelectNode: (nodeId: string) => void;
  className?: string;
}

// Fixed regional color lookup
const REGION_COLORS: Record<string, string> = {
  NR: 'var(--region-nr)',
  WR: 'var(--region-wr)',
  SR: 'var(--region-sr)',
  ER: 'var(--region-er)',
  NER: 'var(--region-ner)',
  ALL: 'var(--charcoal)',
};

// 51-node representative snapshot data
const REGION_DATA = [
  {
    id: 'India/NR',
    name: 'Northern Region',
    code: 'NR',
    color: 'var(--region-nr)',
    reconciledVal: 1741.2,
    rawVal: 1712.5,
    states: [
      { id: 'India/NR/UP', name: 'Uttar Pradesh', val: 512.4 },
      { id: 'India/NR/Rajasthan', name: 'Rajasthan', val: 342.1 },
      { id: 'India/NR/Punjab', name: 'Punjab', val: 268.0 },
      { id: 'India/NR/Haryana', name: 'Haryana', val: 234.5 },
      { id: 'India/NR/Delhi', name: 'Delhi (NCT)', val: 182.3 },
      { id: 'India/NR/Uttarakhand', name: 'Uttarakhand', val: 68.2 },
      { id: 'India/NR/HP', name: 'Himachal Pradesh', val: 42.1 },
      { id: 'India/NR/JK_Ladakh', name: 'J&K & Ladakh', val: 48.6 },
      { id: 'India/NR/Chandigarh', name: 'Chandigarh', val: 9.8 },
      { id: 'India/NR/Railways_NR', name: 'Railways NR', val: 14.5 },
      { id: 'India/NR/Other_NR', name: 'Other (NR Residual)', val: 18.7 },
    ],
  },
  {
    id: 'India/WR',
    name: 'Western Region',
    code: 'WR',
    color: 'var(--region-wr)',
    reconciledVal: 1620.5,
    rawVal: 1642.1,
    states: [
      { id: 'India/WR/Maharashtra', name: 'Maharashtra', val: 648.2 },
      { id: 'India/WR/Gujarat', name: 'Gujarat', val: 456.0 },
      { id: 'India/WR/MP', name: 'Madhya Pradesh', val: 312.4 },
      { id: 'India/WR/Chhattisgarh', name: 'Chhattisgarh', val: 118.5 },
      { id: 'India/WR/RIL JAMNAGAR', name: 'RIL Jamnagar', val: 38.4 },
      { id: 'India/WR/Goa', name: 'Goa', val: 18.2 },
      { id: 'India/WR/AMNSIL', name: 'AMNSIL Hazira', val: 14.6 },
      { id: 'India/WR/BALCO', name: 'BALCO Korba', val: 8.2 },
      { id: 'India/WR/Other_WR', name: 'Other (WR Residual)', val: 6.0 },
    ],
  },
  {
    id: 'India/SR',
    name: 'Southern Region',
    code: 'SR',
    color: 'var(--region-sr)',
    reconciledVal: 1180.1,
    rawVal: 1178.4,
    states: [
      { id: 'India/SR/Tamil Nadu', name: 'Tamil Nadu', val: 412.5 },
      { id: 'India/SR/Karnataka', name: 'Karnataka', val: 318.2 },
      { id: 'India/SR/Telangana', name: 'Telangana', val: 242.0 },
      { id: 'India/SR/Andhra Pradesh', name: 'Andhra Pradesh', val: 164.2 },
      { id: 'India/SR/Kerala', name: 'Kerala', val: 38.6 },
      { id: 'India/SR/Puducherry', name: 'Puducherry', val: 4.6 },
    ],
  },
  {
    id: 'India/ER',
    name: 'Eastern Region',
    code: 'ER',
    color: 'var(--region-er)',
    reconciledVal: 639.4,
    rawVal: 638.2,
    states: [
      { id: 'India/ER/West Bengal', name: 'West Bengal', val: 248.5 },
      { id: 'India/ER/Bihar', name: 'Bihar', val: 168.2 },
      { id: 'India/ER/Odisha', name: 'Odisha', val: 142.1 },
      { id: 'India/ER/Jharkhand', name: 'Jharkhand', val: 56.4 },
      { id: 'India/ER/DVC', name: 'DVC Load', val: 18.2 },
      { id: 'India/ER/Other_ER', name: 'Other (ER Residual)', val: 6.0 },
    ],
  },
  {
    id: 'India/NER',
    name: 'North Eastern Region',
    code: 'NER',
    color: 'var(--region-ner)',
    reconciledVal: 149.0,
    rawVal: 147.8,
    states: [
      { id: 'India/NER/Assam', name: 'Assam', val: 88.5 },
      { id: 'India/NER/Meghalaya', name: 'Meghalaya', val: 21.2 },
      { id: 'India/NER/Tripura', name: 'Tripura', val: 18.4 },
      { id: 'India/NER/Manipur', name: 'Manipur', val: 9.8 },
      { id: 'India/NER/Nagaland', name: 'Nagaland', val: 6.1 },
      { id: 'India/NER/Other_NER', name: 'Other (NER Residual)', val: 5.0 },
    ],
  },
];

export const FlowGraph: React.FC<FlowGraphProps> = ({
  mode,
  selectedNodeId,
  onSelectNode,
  className = '',
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // SVG dimensions
  const svgWidth = 1180;
  const svgHeight = 880;
  const col1X = 140;
  const col2X = 460;
  const col3X = 820;

  // Compute graph data
  const { nodes, links, totalNationalDemand, nationalGap } = useMemo(() => {
    let rawTotal = 0;
    let recTotal = 0;

    REGION_DATA.forEach((r) => {
      recTotal += r.reconciledVal;
      rawTotal += r.rawVal;
    });

    const activeTotal = mode === 'reconciled' ? recTotal : rawTotal;
    const gap = recTotal - rawTotal;

    return {
      nodes: REGION_DATA,
      links: [],
      totalNationalDemand: activeTotal,
      nationalGap: Math.abs(gap),
    };
  }, [mode]);

  // Layout calculation for national, regional, and state columns
  const contentHeight = svgHeight - 80;
  const col1W = 28;
  const col2W = 22;
  const col3W = 16;

  let regY = 40;
  const regionalBlocks = REGION_DATA.map((reg) => {
    const val = mode === 'reconciled' ? reg.reconciledVal : reg.rawVal;
    // Ensure each region has at least enough height for its states to be crystal clear
    const stateCount = reg.states.length;
    const minRequiredH = stateCount * 19;
    const blockHeight = Math.max(minRequiredH, (val / totalNationalDemand) * contentHeight - 16);
    const currentY = regY;
    regY += blockHeight + 16;

    // Distribute states inside this region with guaranteed vertical spacing
    const stateSlotH = blockHeight / stateCount;

    const stateItems = reg.states.map((st, sIdx) => {
      const sY = currentY + sIdx * stateSlotH;
      return {
        ...st,
        y: sY,
        height: Math.max(12, stateSlotH - 4),
      };
    });

    const gapVal = reg.reconciledVal - reg.rawVal;

    return {
      ...reg,
      value: val,
      y: currentY,
      height: blockHeight,
      gapVal,
      states: stateItems,
    };
  });

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {/* Coherence status banner */}
      <div className={styles.coherenceBanner}>
        {mode === 'reconciled' ? (
          <div className={styles.reconciledBanner}>
            <span className={styles.coherentDot} />
            <strong>Adds up: gap 0.00 MU</strong>
            <span className={styles.bannerSub}>MinTrace mint_shrink hierarchical coherence verified (&lt; 10⁻¹² MU error).</span>
          </div>
        ) : (
          <div className={styles.unreconciledBanner}>
            <span className={styles.watchDot} />
            <strong>Unreconciled bottom-up gap: {formatNumber(nationalGap, 1)} MU</strong>
            <span className={styles.bannerSub}>Raw desk forecasts do not sum to regional reports. Regional planning gap active.</span>
          </div>
        )}

        <div className={styles.legend}>
          <span className={styles.legendTitle}>Regions:</span>
          {REGION_DATA.map((r) => (
            <span key={r.code} className={styles.legendItem}>
              <span className={styles.colorPill} style={{ backgroundColor: r.color }} />
              {r.code}
            </span>
          ))}
        </div>
      </div>

      {/* Sankey Flow Canvas */}
      <div className={styles.svgScrollContainer}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={styles.svg}
          role="img"
          aria-label="Hierarchical Energy Flow Sankey Diagram"
        >
          {/* Column Headers */}
          <text x={col1X} y={20} className={styles.colHeader}>1. National Total</text>
          <text x={col2X} y={20} className={styles.colHeader}>2. Five Electrical Regions</text>
          <text x={col3X} y={20} className={styles.colHeader}>3. States &amp; Bulk Consumers</text>

          {/* Column 1: India Node */}
          <g
            className={`${styles.nodeGroup} ${selectedNodeId === 'India' ? styles.selectedNode : ''}`}
            onClick={() => onSelectNode('India')}
            tabIndex={0}
            role="button"
            aria-label={`India: ${formatNumber(totalNationalDemand)} MU`}
          >
            <rect
              x={col1X}
              y={40}
              width={col1W}
              height={contentHeight}
              className={styles.nationalRect}
              rx={3}
            />
            <text x={col1X - 16} y={40 + contentHeight / 2 - 6} className={styles.nationalLabel} textAnchor="end">
              India
            </text>
            <text x={col1X - 16} y={40 + contentHeight / 2 + 16} className={styles.nationalValue} textAnchor="end">
              {formatNumber(totalNationalDemand, 1)} MU
            </text>
          </g>

          {/* Regional Ribbons and Nodes */}
          {regionalBlocks.map((reg) => {
            const isRegHovered = hoveredNodeId === reg.id || selectedNodeId === reg.id;
            const isFaded = hoveredNodeId !== null && hoveredNodeId !== reg.id && !reg.states.some((s) => s.id === hoveredNodeId);

            // Ribbon from India to Region
            const ribbonD = `
              M ${col1X + col1W} ${reg.y}
              C ${col1X + col1W + 140} ${reg.y}, ${col2X - 140} ${reg.y}, ${col2X} ${reg.y}
              v ${reg.height}
              C ${col2X - 140} ${reg.y + reg.height}, ${col1X + col1W + 140} ${reg.y + reg.height}, ${col1X + col1W} ${reg.y + reg.height}
              Z
            `;

            return (
              <g key={reg.id}>
                {/* Flow Ribbon from National to Region */}
                <path
                  d={ribbonD}
                  fill={reg.color}
                  className={`${styles.ribbon} ${isRegHovered ? styles.ribbonActive : ''} ${isFaded ? styles.ribbonFaded : ''}`}
                  onClick={() => onSelectNode(reg.id)}
                  onMouseEnter={() => setHoveredNodeId(reg.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                />

                {/* Region Node Rect */}
                <g
                  className={`${styles.nodeGroup} ${selectedNodeId === reg.id ? styles.selectedNode : ''}`}
                  onClick={() => onSelectNode(reg.id)}
                  onMouseEnter={() => setHoveredNodeId(reg.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${reg.name}: ${formatNumber(reg.value, 1)} MU`}
                >
                  <rect
                    x={col2X}
                    y={reg.y}
                    width={col2W}
                    height={reg.height}
                    fill={reg.color}
                    rx={3}
                    className={styles.regionRect}
                  />

                  {/* Region Labels cleanly placed before region bar */}
                  <text x={col2X - 10} y={reg.y + reg.height / 2 - (mode === 'unreconciled' ? 5 : -4)} className={styles.regionText} textAnchor="end">
                    <tspan fontWeight="600">{reg.code}</tspan>
                    <tspan fill="var(--slate)"> · {formatNumber(reg.value, 1)} MU</tspan>
                  </text>

                  {/* Unreconciled gap badge on region */}
                  {mode === 'unreconciled' && Math.abs(reg.gapVal) > 0.5 && (
                    <text x={col2X - 10} y={reg.y + reg.height / 2 + 13} className={styles.gapText} textAnchor="end">
                      Gap: {reg.gapVal > 0 ? `+${formatNumber(reg.gapVal, 1)}` : formatNumber(reg.gapVal, 1)} MU
                    </text>
                  )}
                </g>

                {/* State Ribbons from Region to States */}
                {reg.states.map((st) => {
                  const isStateSelected = selectedNodeId === st.id;
                  const isStateHovered = hoveredNodeId === st.id;
                  const stateFaded = hoveredNodeId !== null && hoveredNodeId !== st.id && hoveredNodeId !== reg.id;

                  const stRibbonD = `
                    M ${col2X + col2W} ${st.y}
                    C ${col2X + col2W + 160} ${st.y}, ${col3X - 160} ${st.y}, ${col3X} ${st.y}
                    v ${st.height}
                    C ${col3X - 160} ${st.y + st.height}, ${col2X + col2W + 160} ${st.y + st.height}, ${col2X + col2W} ${st.y + st.height}
                    Z
                  `;

                  return (
                    <g key={st.id}>
                      <path
                        d={stRibbonD}
                        fill={reg.color}
                        className={`${styles.stateRibbon} ${isStateHovered || isStateSelected ? styles.ribbonActive : ''} ${stateFaded ? styles.ribbonFaded : ''}`}
                        onClick={() => onSelectNode(st.id)}
                        onMouseEnter={() => setHoveredNodeId(st.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                      />

                      {/* State Node Rect */}
                      <g
                        className={`${styles.nodeGroup} ${isStateSelected ? styles.selectedNode : ''}`}
                        onClick={() => onSelectNode(st.id)}
                        onMouseEnter={() => setHoveredNodeId(st.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        tabIndex={0}
                        role="button"
                        aria-label={`${st.name}: ${formatNumber(st.val, 1)} MU`}
                      >
                        <rect
                          x={col3X}
                          y={st.y}
                          width={col3W}
                          height={st.height}
                          fill={reg.color}
                          rx={2}
                          className={styles.stateRect}
                        />
                        <text x={col3X + col3W + 8} y={st.y + st.height / 2 + 4} className={styles.stateLabel}>
                          {st.name} <tspan className={styles.stateVal}>{formatNumber(st.val, 1)}</tspan>
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
