/**
 * Build the SVG path string for the energy sparkline. Pure function
 * over the energy series; the smoothing rule lives in
 * `setlists/energy-curve.core.ts`, this util only turns the smoothed
 * series into geometry.
 *
 * Geometry contract:
 *  - the path uses a `M`-then-`L` chain to draw a polyline.
 *  - whenever a point is a `gap` (null value), the next segment is
 *    detached via another `M` — the SVG renderer skips the missing
 *    interval rather than interpolating across it.
 */

import { smoothedSeries } from '@api/setlists/energy-curve.core';

const ENERGY_VALUE_MIN = 1;
const ENERGY_VALUE_MAX = 10;
const ENERGY_SPAN = ENERGY_VALUE_MAX - ENERGY_VALUE_MIN;

export interface SparklineGeometry {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
}

export function sparklinePath(
  values: readonly (number | null)[],
  geometry: SparklineGeometry,
): string {
  const series = smoothedSeries(values);
  if (series.length === 0) return '';
  const usableWidth = geometry.width - geometry.padding * 2;
  const usableHeight = geometry.height - geometry.padding * 2;
  const stepX = series.length > 1 ? usableWidth / (series.length - 1) : 0;
  const points = series.map((point, index) => {
    const normalised = (point.value - ENERGY_VALUE_MIN) / ENERGY_SPAN;
    const x = geometry.padding + stepX * index;
    const y = geometry.padding + usableHeight * (1 - normalised);
    return { x, y, gap: point.gap };
  });
  let path = '';
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point === undefined) continue;
    const previous = points[index - 1];
    const command = index === 0 || (previous?.gap ?? false) || point.gap ? 'M' : 'L';
    path += `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
  }
  return path.trim();
}
