/**
 * Sparkline path geometry — pure, deterministic, fully covered. The
 * SVG renderer in the sibling `EnergySparkline.tsx` just consumes
 * `path` + `points`.
 *
 *  - `width` is the total SVG width in user units,
 *  - `height` is the total SVG height in user units,
 *  - `values` is a sequence of 1..10 energy levels (nullable —
 *    nulls fall back to 5, the neutral midpoint),
 *  - the curve is the Catmull-Rom-ish quadratic-Bezier chain the
 *    prototype's `EnergySparkline` uses.
 */

const VERTICAL_PADDING = 6;
const ENERGY_FALLBACK = 5;
const ENERGY_MAX = 10;

export interface SparklineGeometry {
  path: string;
  points: readonly (readonly [number, number])[];
}

export function buildSparklinePath(
  values: readonly (number | null | undefined)[],
  width: number,
  height: number,
): SparklineGeometry {
  if (values.length === 0) {
    return { path: '', points: [] };
  }
  const usableHeight = height - VERTICAL_PADDING * 2;
  const lastIndex = values.length - 1;
  const points = values.map((rawValue, index): [number, number] => {
    const value = rawValue ?? ENERGY_FALLBACK;
    const x = lastIndex === 0 ? width / 2 : (index / lastIndex) * width;
    const y = height - VERTICAL_PADDING - (value / ENERGY_MAX) * usableHeight;
    return [x, y];
  });
  const pathSegments = points.map((point, index) => {
    if (index === 0) return `M ${point[0]} ${point[1]}`;
    const previous = points[index - 1];
    // The first branch returned above guarantees `previous` exists for
    // `index >= 1`. TypeScript can't see the invariant; we narrow once.
    if (previous === undefined) return '';
    const controlX = (previous[0] + point[0]) / 2;
    const controlY = (previous[1] + point[1]) / 2;
    return `Q ${previous[0]} ${previous[1]} ${controlX} ${controlY} T ${point[0]} ${point[1]}`;
  });
  return { path: pathSegments.join(' '), points };
}
