/**
 * Pure SVG-geometry builder for the elevation profile under the map.
 *
 * Inputs: the per-point elevations parallel to the GPX track, the
 * cumulative distances built by `indexTrack`, and the SVG `width`/`height`
 * the parent component renders into. Outputs: the two `points=` strings
 * that drive the `<polygon>` (filled area) and `<polyline>` (stroked
 * curve), plus a closure `yAt(distanceFraction)` the call site invokes per
 * runner pastille to place it on the curve.
 *
 * The closure form is intentional — both the React component and the unit
 * tests only ever read `geometry.yAt(fraction)`; returning a free function
 * separate from the geometry would force the caller to thread the index
 * back in. Closure captures `cumulativeDistances` by reference; we never
 * mutate that array in the codebase so the implicit borrow is safe.
 */

const Y_TOP_MARGIN_FRACTION = 0.05;

export interface ProfileGeometry {
  /** SVG `points=` for a `<polygon>` closed at the bottom of the canvas. */
  readonly areaPolygonPoints: string;
  /** SVG `points=` for the `<polyline>` traced on top of the filled area. */
  readonly linePolylinePoints: string;
  /** Resolves a runner's `distanceFraction` to the matching Y coordinate. */
  readonly yAt: (distanceFraction: number) => number;
  readonly width: number;
  readonly height: number;
}

interface Sample {
  readonly elevation: number;
  readonly cumulative: number;
}

function clampFraction(fraction: number): number {
  if (fraction <= 0) return 0;
  if (fraction >= 1) return 1;
  return fraction;
}

function zipSamples(
  pointElevations: ReadonlyArray<number>,
  cumulativeDistances: ReadonlyArray<number>,
): readonly Sample[] {
  // Lock-step iteration: `for…of` over `pointElevations` yields each entry
  // as `number` (not `number | undefined`), and a fresh iterator over
  // `cumulativeDistances` advances in tandem. Either input running short
  // truncates the join — defensive against length mismatch even though
  // the Zod refine forbids it.
  const samples: Sample[] = [];
  const cumulativeIterator = cumulativeDistances[Symbol.iterator]();
  for (const elevation of pointElevations) {
    const cursor = cumulativeIterator.next();
    if (cursor.done === true) break;
    samples.push({ elevation, cumulative: cursor.value });
  }
  return samples;
}

interface SampleStats {
  readonly firstSample: Sample;
  readonly lastSample: Sample;
  readonly minElevation: number;
  readonly maxElevation: number;
  readonly totalDistance: number;
}

/**
 * Walk a non-empty samples array exactly once to extract first/last
 * sample and elevation/distance extrema. Returns `null` for an empty
 * array — letting the caller short-circuit before any divide-by-zero
 * could happen. Splitting this out lets the caller stop indexed-accessing
 * `samples[0]`, which would otherwise force a `??` defensive default
 * that's unreachable in practice but counts against branch coverage.
 */
function summarise(samples: readonly Sample[]): SampleStats | null {
  let firstSample: Sample | null = null;
  let lastSample: Sample | null = null;
  let minElevation = Number.POSITIVE_INFINITY;
  let maxElevation = Number.NEGATIVE_INFINITY;
  let totalDistance = 0;
  for (const sample of samples) {
    if (firstSample === null) firstSample = sample;
    lastSample = sample;
    if (sample.elevation < minElevation) minElevation = sample.elevation;
    if (sample.elevation > maxElevation) maxElevation = sample.elevation;
    if (sample.cumulative > totalDistance) totalDistance = sample.cumulative;
  }
  if (firstSample === null || lastSample === null) return null;
  return { firstSample, lastSample, minElevation, maxElevation, totalDistance };
}

/**
 * Build the area-polygon points, the line-polyline points, and the
 * fraction-to-Y closure for a given series of elevations + cumulative
 * distances.
 *
 * Edge cases:
 * - Empty `pointElevations`: returns a degenerate baseline polygon and a
 *   constant `yAt` at the mid-line. Callers are expected to render the
 *   placeholder before reaching this branch.
 * - Flat profile (`minElevation === maxElevation`): the Y axis collapses
 *   and every sample sits at `height / 2`. No divide-by-zero.
 *
 * @param pointElevations per-point elevation in meters, parallel to the
 *   GPX track (`length === points.length` enforced by the Zod refine).
 * @param cumulativeDistances cumulative meters from `points[0]`, parallel
 *   to `pointElevations`. Built once per render via
 *   `indexTrack(points).cumulative`.
 * @param width pixel width of the SVG `viewBox`.
 * @param height pixel height of the SVG `viewBox`.
 */
export function buildProfileGeometry(
  pointElevations: ReadonlyArray<number>,
  cumulativeDistances: ReadonlyArray<number>,
  width: number,
  height: number,
): ProfileGeometry {
  const samples = zipSamples(pointElevations, cumulativeDistances);
  const midLineY = height / 2;
  const stats = summarise(samples);
  if (stats === null) {
    return {
      areaPolygonPoints: `0,${height} ${width},${height}`,
      linePolylinePoints: '',
      yAt: () => midLineY,
      width,
      height,
    };
  }
  const { firstSample, lastSample, minElevation, maxElevation, totalDistance } = stats;
  const elevationSpan = maxElevation - minElevation;
  const usableHeight = height * (1 - Y_TOP_MARGIN_FRACTION);

  function yForElevation(elevation: number): number {
    if (elevationSpan === 0) return midLineY;
    // Reserve `Y_TOP_MARGIN_FRACTION` at the top so the peak doesn't kiss
    // the SVG ceiling. Y axis is inverted in SVG (0 = top), so the
    // highest elevation gets the smallest Y.
    const normalised = (elevation - minElevation) / elevationSpan;
    return height - normalised * usableHeight;
  }

  function xForCumulative(cumulative: number): number {
    if (totalDistance === 0) return 0;
    return (cumulative / totalDistance) * width;
  }

  const linePieces: string[] = [];
  for (const sample of samples) {
    linePieces.push(`${xForCumulative(sample.cumulative)},${yForElevation(sample.elevation)}`);
  }
  const linePolylinePoints = linePieces.join(' ');
  // The area polygon closes at the bottom of the canvas: bottom-left, the
  // curve top-to-tail, bottom-right. That order matches the `linearGradient`
  // semantics (fill flows from the curve down to the baseline).
  const areaPolygonPoints = `0,${height} ${linePolylinePoints} ${width},${height}`;

  function yAt(distanceFraction: number): number {
    if (samples.length === 1 || totalDistance === 0) {
      return yForElevation(firstSample.elevation);
    }
    const clamped = clampFraction(distanceFraction);
    if (clamped === 0) return yForElevation(firstSample.elevation);
    if (clamped === 1) return yForElevation(lastSample.elevation);
    const targetDistance = clamped * totalDistance;
    // Linear scan — `samples` has up to ~2644 entries on the Strava
    // sample; the cost is negligible vs. the React render budget. We
    // trade a binary-search optimisation for a simpler closure.
    let previousSample = firstSample;
    let foundSample = lastSample;
    let foundSegment = false;
    let isFirstIteration = true;
    for (const sample of samples) {
      if (isFirstIteration) {
        isFirstIteration = false;
        continue;
      }
      if (sample.cumulative < targetDistance) {
        previousSample = sample;
        continue;
      }
      foundSample = sample;
      foundSegment = true;
      break;
    }
    if (!foundSegment) return yForElevation(lastSample.elevation);
    // `segmentSpan === 0` is unreachable here: `previousSample` is only
    // advanced when its cumulative was strictly < `targetDistance`, and
    // `foundSample.cumulative >= targetDistance`, so they cannot be
    // equal. We omit the defensive branch rather than `/* v8 ignore */` it
    // (CLAUDE.md rule). If a future caller passes non-monotonic cumulative
    // distances, the worst case is an extreme `localFraction`, never a
    // divide-by-zero.
    const segmentSpan = foundSample.cumulative - previousSample.cumulative;
    const localFraction = (targetDistance - previousSample.cumulative) / segmentSpan;
    const interpolatedElevation =
      previousSample.elevation + (foundSample.elevation - previousSample.elevation) * localFraction;
    return yForElevation(interpolatedElevation);
  }

  return { areaPolygonPoints, linePolylinePoints, yAt, width, height };
}
