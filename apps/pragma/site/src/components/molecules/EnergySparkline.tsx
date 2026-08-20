/** @Feature setlists */

import { buildSparklinePath } from './energy-sparkline.utils';

export interface EnergySparklineProps {
  values: readonly (number | null | undefined)[];
  height?: number;
  accent?: string;
}

const VIEWBOX_WIDTH = 360;
const DEFAULT_HEIGHT = 64;
const POINT_DIAMETER_PX = 6;
const LINE_WIDTH = 2;
const PERCENT_SCALE = 100;

// @FollowsBlueprint molecule-presentational
export function EnergySparkline({
  values,
  height = DEFAULT_HEIGHT,
  accent = 'var(--color-accent)',
}: EnergySparklineProps): JSX.Element | null {
  if (values.length === 0) return null;
  const { path, points } = buildSparklinePath(values, VIEWBOX_WIDTH, height);
  const closingPath = `${path} L ${VIEWBOX_WIDTH} ${height} L 0 ${height} Z`;
  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="block"
      >
        <defs>
          <linearGradient id="pragma-sparkline-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={closingPath} fill="url(#pragma-sparkline-grad)" />
        <path
          d={path}
          stroke={accent}
          strokeWidth={LINE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {points.map(([x, y], pointIndex) => (
        <span
          key={`point-${pointIndex}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${(x / VIEWBOX_WIDTH) * PERCENT_SCALE}%`,
            top: y,
            width: POINT_DIAMETER_PX,
            height: POINT_DIAMETER_PX,
            backgroundColor: accent,
          }}
        />
      ))}
    </div>
  );
}
