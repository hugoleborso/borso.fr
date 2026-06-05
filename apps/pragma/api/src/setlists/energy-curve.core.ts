/**
 * Energy-curve transformations for the setlist sparkline.
 *
 * Setlist entries carry an integer 1..10 (or null) energy value. The
 * sparkline renders N+1 anchor points for N entries: an implicit
 * starting baseline of 5 (mid-range), then each entry's value in order.
 * Null entries render as gaps — the smoother does not interpolate
 * across them.
 *
 * `smoothedSeries` returns the points alongside a `gap: true` flag for
 * positions where the source carried a null. The UI uses the flag to
 * decide whether to draw a line segment to the next point.
 *
 * `peakIndex` returns the index of the maximum non-null point, or
 * null if the whole series is null.
 *
 * Pure functions; no clock, no I/O.
 */

export const BASELINE_ENERGY = 5;
export const MIN_ENERGY = 1;
export const MAX_ENERGY = 10;

export interface SmoothedPoint {
  index: number;
  value: number;
  gap: boolean;
}

export function smoothedSeries(values: readonly (number | null)[]): readonly SmoothedPoint[] {
  const points: SmoothedPoint[] = [{ index: 0, value: BASELINE_ENERGY, gap: false }];
  values.forEach((value, position) => {
    if (value === null) {
      points.push({ index: position + 1, value: BASELINE_ENERGY, gap: true });
    } else {
      points.push({ index: position + 1, value, gap: false });
    }
  });
  return points;
}

export function peakIndex(values: readonly (number | null)[]): number | null {
  let bestIndex: number | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  values.forEach((value, position) => {
    if (value === null) return;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = position;
    }
  });
  return bestIndex;
}

export function isValidEnergy(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_ENERGY && value <= MAX_ENERGY;
}
