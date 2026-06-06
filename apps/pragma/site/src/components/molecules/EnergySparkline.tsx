/**
 * EnergySparkline — smooth Catmull-Rom-ish curve drawn over a
 * sequence of 1..10 energy values. Used in the Setlist editor and
 * any session-card summary. The smoothing logic itself lives in
 * the sibling `*.utils.ts` so it's covered at 100%.
 *
 * The SVG is rendered at its measured pixel width (viewBox === layout
 * box, 1:1) rather than a fixed viewBox stretched to 100%. Stretching
 * a fixed viewBox with `preserveAspectRatio="none"` squashed the point
 * markers into ovals on wide (desktop) layouts — the horizontal scale
 * far exceeds the vertical one. Measuring keeps the scale uniform, so
 * the dots stay round. The width is tracked via a `ResizeObserver`
 * owned by the container's ref callback (created on attach, disconnected
 * on detach) — no effect needed.
 */

import { useCallback, useRef, useState } from 'react';
import { buildSparklinePath } from './energy-sparkline.utils';

export interface EnergySparklineProps {
  values: readonly (number | null | undefined)[];
  height?: number;
  accent?: string;
}

const FALLBACK_WIDTH = 360;
const DEFAULT_HEIGHT = 64;
const POINT_RADIUS = 3;
const LINE_WIDTH = 2;

export function EnergySparkline({
  values,
  height = DEFAULT_HEIGHT,
  accent = 'var(--color-accent)',
}: EnergySparklineProps): JSX.Element | null {
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (node === null) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined && width > 0) setMeasuredWidth(width);
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  if (values.length === 0) return null;
  const width = measuredWidth > 0 ? measuredWidth : FALLBACK_WIDTH;
  const { path, points } = buildSparklinePath(values, width, height);
  const closingPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <div ref={containerRef} className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
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
        />
        {points.map(([x, y], index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: sparkline points are a stable visual sequence, index is the index
          <circle key={index} cx={x} cy={y} r={POINT_RADIUS} fill={accent} />
        ))}
      </svg>
    </div>
  );
}
