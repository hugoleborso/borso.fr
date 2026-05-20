/**
 * EnergySparkline — smooth Catmull-Rom-ish curve drawn over a
 * sequence of 1..10 energy values. Used in the Setlist editor and
 * any session-card summary. The smoothing logic itself lives in
 * the sibling `*.utils.ts` so it's covered at 100%.
 */

import { buildSparklinePath } from './energy-sparkline.utils';

export interface EnergySparklineProps {
  values: readonly (number | null | undefined)[];
  width?: number;
  height?: number;
  accent?: string;
}

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 64;

export function EnergySparkline({
  values,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  accent = 'var(--color-accent)',
}: EnergySparklineProps): JSX.Element | null {
  if (values.length === 0) return null;
  const { path, points } = buildSparklinePath(values, width, height);
  const closingPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pragma-sparkline-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={closingPath} fill="url(#pragma-sparkline-grad)" />
      <path d={path} stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {points.map(([x, y], index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: sparkline points are a stable visual sequence, index is the index
        <circle key={index} cx={x} cy={y} r="2.5" fill={accent} />
      ))}
    </svg>
  );
}
