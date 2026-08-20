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
 * @Feature setlists
 */

const VERTICAL_PADDING = 6;
const VERTICALLY_PADDED_EDGES = 2;
const MIDPOINT_FRACTION = 0.5;
const ENERGY_FALLBACK = 5;
const ENERGY_MAX = 10;

export interface SparklineGeometry {
  path: string;
  points: readonly (readonly [number, number])[];
}

// @FollowsBlueprint utils-pure-module
export function buildSparklinePath(
  values: readonly (number | null | undefined)[],
  width: number,
  height: number,
): SparklineGeometry {
  const usableHeight = height - VERTICAL_PADDING * VERTICALLY_PADDED_EDGES;
  const lastIndex = values.length - 1;
  const points = values.map((rawValue, index): [number, number] => {
    const value = rawValue ?? ENERGY_FALLBACK;
    const xCoordinate = lastIndex === 0 ? width * MIDPOINT_FRACTION : (index / lastIndex) * width;
    const yCoordinate = height - VERTICAL_PADDING - (value / ENERGY_MAX) * usableHeight;
    return [xCoordinate, yCoordinate];
  });
  const pathSegments = points.map((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined) return `M ${point[0]} ${point[1]}`;
    const controlX = (previous[0] + point[0]) * MIDPOINT_FRACTION;
    const controlY = (previous[1] + point[1]) * MIDPOINT_FRACTION;
    return `Q ${previous[0]} ${previous[1]} ${controlX} ${controlY} T ${point[0]} ${point[1]}`;
  });
  return { path: pathSegments.join(' '), points };
}
