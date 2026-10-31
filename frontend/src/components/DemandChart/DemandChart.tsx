import React, { useState } from 'react';
import { formatNumber, formatDate } from '../../lib/format';
import styles from './DemandChart.module.css';

export interface ChartDataPoint {
  date: string;         // '2026-09-13'
  dateLabel: string;    // '13 Sep'
  reconciled: number;   // 5330.2
  unreconciled?: number;// 5310.2
  q90Lower?: number;    // 5120.0
  q90Upper?: number;    // 5540.0
  q95Lower?: number;    // 5040.0
  q95Upper?: number;    // 5620.0
}

export interface DemandChartProps {
  data: ChartDataPoint[];
  showExpectedRange?: boolean;
  showComparison?: boolean;
  className?: string;
}

export const DemandChart: React.FC<DemandChartProps> = ({
  data,
  showExpectedRange = true,
  showComparison = true,
  className = '',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  // Chart dimensions & padding
  const svgWidth = 1000;
  const svgHeight = 280;
  const padLeft = 80;
  const padRight = 200; // space for direct line labels on the right!
  const padTop = 24;
  const padBottom = 40;

  const innerWidth = svgWidth - padLeft - padRight;
  const innerHeight = svgHeight - padTop - padBottom;

  // Calculate y bounds
  let minY = Infinity;
  let maxY = -Infinity;

  data.forEach((d) => {
    const vals = [d.reconciled];
    if (d.unreconciled !== undefined) vals.push(d.unreconciled);
    if (showExpectedRange) {
      if (d.q95Lower !== undefined) vals.push(d.q95Lower);
      if (d.q95Upper !== undefined) vals.push(d.q95Upper);
      if (d.q90Lower !== undefined) vals.push(d.q90Lower);
      if (d.q90Upper !== undefined) vals.push(d.q90Upper);
    }
    vals.forEach((v) => {
      if (v < minY) minY = v;
      if (v > maxY) maxY = v;
    });
  });

  // Add 8% buffer
  const yBuffer = (maxY - minY) * 0.1 || 100;
  const chartMinY = Math.floor((minY - yBuffer) / 50) * 50;
  const chartMaxY = Math.ceil((maxY + yBuffer) / 50) * 50;
  const yRange = chartMaxY - chartMinY || 1;

  const getX = (index: number) => {
    return padLeft + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return padTop + innerHeight - ((val - chartMinY) / yRange) * innerHeight;
  };

  // Generate 4 horizontal gridlines
  const gridTicks = [0, 0.33, 0.66, 1].map((pct) => {
    const val = chartMinY + pct * yRange;
    const y = getY(val);
    return { val: Math.round(val), y };
  });

  // Paths
  const mainLinePoints = data.map((d, i) => `${getX(i)},${getY(d.reconciled)}`).join(' ');
  const lastIndex = data.length - 1;
  const lastPoint = { x: getX(lastIndex), y: getY(data[lastIndex].reconciled) };

  // Comparison path
  const comparisonLinePoints = showComparison
    ? data
        .filter((d) => d.unreconciled !== undefined)
        .map((d, i) => `${getX(i)},${getY(d.unreconciled!)}`)
        .join(' ')
    : '';

  const lastCompPoint = showComparison && data[lastIndex].unreconciled !== undefined
    ? { x: getX(lastIndex), y: getY(data[lastIndex].unreconciled!) }
    : null;

  // Expected range band polygon (90%)
  const q90BandPoints = showExpectedRange && data[0].q90Lower !== undefined
    ? [
        ...data.map((d, i) => `${getX(i)},${getY(d.q90Upper!)}`),
        ...[...data].reverse().map((d, i) => `${getX(lastIndex - i)},${getY(d.q90Lower!)}`),
      ].join(' ')
    : '';

  // Wider range band polygon (95%)
  const q95BandPoints = showExpectedRange && data[0].q95Lower !== undefined
    ? [
        ...data.map((d, i) => `${getX(i)},${getY(d.q95Upper!)}`),
        ...[...data].reverse().map((d, i) => `${getX(lastIndex - i)},${getY(d.q95Lower!)}`),
      ].join(' ')
    : '';

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.chartSvgWrapper}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={styles.svg}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Defs for gradients/patterns if needed */}
          <defs>
            <style>{`
              .grid-line { stroke: var(--slate); stroke-opacity: 0.20; stroke-width: 1px; }
              .axis-text { font-family: var(--font-sans); font-size: 12px; fill: var(--slate); }
              .direct-label { font-family: var(--font-sans); font-size: 12px; font-weight: 500; }
            `}</style>
          </defs>

          {/* Horizontal gridlines ONLY, in slate at 20% opacity. NO vertical gridlines! */}
          {gridTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={padLeft + innerWidth}
                y2={tick.y}
                className="grid-line"
              />
              <text
                x={padLeft - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="axis-text"
              >
                {formatNumber(tick.val, 0)}
              </text>
            </g>
          ))}

          {/* Y Axis unit header */}
          <text
            x={padLeft - 10}
            y={padTop - 8}
            textAnchor="end"
            className="axis-text"
            style={{ fontWeight: 600 }}
          >
            MU per day
          </text>

          {/* X Axis date labels */}
          {data.map((d, i) => {
            // Show every second or third label on wide screens to prevent crowding
            if (i % 2 !== 0 && i !== lastIndex) return null;
            const x = getX(i);
            return (
              <text
                key={i}
                x={x}
                y={svgHeight - 12}
                textAnchor="middle"
                className="axis-text"
              >
                {d.dateLabel}
              </text>
            );
          })}

          {/* Wider 95% expected range band */}
          {showExpectedRange && q95BandPoints && (
            <polygon
              points={q95BandPoints}
              className={styles.q95Band}
              aria-label="Wider expected range (95%)"
            />
          )}

          {/* Inner 90% expected range band */}
          {showExpectedRange && q90BandPoints && (
            <polygon
              points={q90BandPoints}
              className={styles.q90Band}
              aria-label="Expected range (90%)"
            />
          )}

          {/* Comparison series (unreconciled): slate, dashed, labelled */}
          {showComparison && comparisonLinePoints && (
            <polyline
              points={comparisonLinePoints}
              className={styles.comparisonLine}
            />
          )}

          {/* Main series: solid safety-blue line, no markers except the last point */}
          <polyline
            points={mainLinePoints}
            className={styles.mainLine}
          />

          {/* Marker at the last point */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={5}
            className={styles.lastPointDot}
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={8}
            className={styles.lastPointRing}
          />

          {/* Direct Labels at Right-Hand Ends (Section 3 rule: better, label lines directly at their right-hand ends) */}
          {(() => {
            const isNear = lastCompPoint && Math.abs(lastPoint.y - lastCompPoint.y) < 18;
            const mainLabelY = isNear ? lastPoint.y - 8 : lastPoint.y + 4;
            const compLabelY = isNear ? lastCompPoint.y + 12 : lastCompPoint.y + 4;
            return (
              <>
                <text
                  x={lastPoint.x + 14}
                  y={mainLabelY}
                  className={`direct-label ${styles.directLabelMain}`}
                >
                  Reconciled forecast
                </text>
                {lastCompPoint && (
                  <text
                    x={lastCompPoint.x + 14}
                    y={compLabelY}
                    className={`direct-label ${styles.directLabelComp}`}
                  >
                    Separate desk forecasts
                  </text>
                )}
              </>
            );
          })()}

          {/* Hover hit targets for interactive tooltip */}
          {data.map((d, i) => {
            const x = getX(i);
            return (
              <rect
                key={i}
                x={x - innerWidth / (data.length * 2)}
                y={padTop}
                width={innerWidth / data.length}
                height={innerHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}

          {/* Active hover cursor line */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={padTop}
              x2={getX(hoverIndex)}
              y2={padTop + innerHeight}
              className={styles.hoverCursor}
            />
          )}
        </svg>

        {/* Floating Tooltip */}
        {activePoint && hoverIndex !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: `calc(${(getX(hoverIndex) / svgWidth) * 100}% - 90px)`,
              top: '16px',
            }}
          >
            <div className={styles.tooltipDate}>{formatDate(activePoint.date)}</div>
            <div className={styles.tooltipValRow}>
              <span className={styles.tooltipDotMain} />
              <span className={styles.tooltipLabel}>Forecast:</span>
              <strong className="tabular">{formatNumber(activePoint.reconciled, 1)} MU</strong>
            </div>
            {activePoint.q90Lower && activePoint.q90Upper && (
              <div className={styles.tooltipRangeRow}>
                <span className={styles.tooltipDotBand} />
                <span className={styles.tooltipLabel}>Expected:</span>
                <span className="tabular">{formatNumber(activePoint.q90Lower, 0)} – {formatNumber(activePoint.q90Upper, 0)} MU</span>
              </div>
            )}
            {activePoint.unreconciled !== undefined && (
              <div className={styles.tooltipCompRow}>
                <span className={styles.tooltipDotComp} />
                <span className={styles.tooltipLabel}>Separate desks:</span>
                <span className="tabular">{formatNumber(activePoint.unreconciled, 1)} MU</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plain-Language Chart Caption (Section 3 rule: short caption states what each line is) */}
      <div className={styles.captionRow}>
        <p className={styles.captionText}>
          <strong>Solid safety-blue line:</strong> Coherent national forecast for India.{' '}
          {showComparison && (
            <>
              <strong>Dashed slate line:</strong> Separate forecasts from unadjusted regional desks.{' '}
            </>
          )}
          {showExpectedRange && (
            <>
              <strong>Shaded bands:</strong> Expected range where actual demand fell 90% of the time on past test days.
            </>
          )}
        </p>
      </div>
    </div>
  );
};
