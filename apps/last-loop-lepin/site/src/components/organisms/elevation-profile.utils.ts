const Y_TOP_MARGIN_FRACTION = 0.05;
const VERTICAL_MIDPOINT_FRACTION = 0.5;

export interface ProfileGeometry {
  readonly areaPolygonPoints: string;
  readonly linePolylinePoints: string;
  readonly yAt: (distanceFraction: number) => number;
  readonly width: number;
  readonly height: number;
}

interface Sample {
  readonly elevation: number;
  readonly cumulative: number;
}

function zipSamples(
  pointElevations: readonly number[],
  cumulativeDistances: readonly number[],
): readonly Sample[] {
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

function summarise(samples: readonly Sample[]): SampleStats | null {
  const firstSample = samples[0];
  if (firstSample === undefined) return null;
  let lastSample = firstSample;
  let minElevation = firstSample.elevation;
  let maxElevation = firstSample.elevation;
  let totalDistance = 0;
  for (const sample of samples) {
    lastSample = sample;
    minElevation = Math.min(minElevation, sample.elevation);
    maxElevation = Math.max(maxElevation, sample.elevation);
    totalDistance = Math.max(totalDistance, sample.cumulative);
  }
  return { firstSample, lastSample, minElevation, maxElevation, totalDistance };
}

export interface ProfileGeometryRequest {
  readonly pointElevations: readonly number[];
  readonly cumulativeDistances: readonly number[];
  readonly width: number;
  readonly height: number;
}

// @FollowsBlueprint utils-geometry
export function buildProfileGeometry({
  pointElevations,
  cumulativeDistances,
  width,
  height,
}: ProfileGeometryRequest): ProfileGeometry {
  const samples = zipSamples(pointElevations, cumulativeDistances);
  const midLineY = height * VERTICAL_MIDPOINT_FRACTION;
  const bottomLeftCorner = `0,${height}`;
  const bottomRightCorner = `${width},${height}`;
  const stats = summarise(samples);
  if (stats === null) {
    return {
      areaPolygonPoints: `${bottomLeftCorner} ${bottomRightCorner}`,
      linePolylinePoints: '',
      yAt: () => midLineY,
      width,
      height,
    };
  }
  const { firstSample, lastSample, minElevation, maxElevation, totalDistance } = stats;
  const elevationSpan = maxElevation - minElevation;
  const heightBelowTopMargin = height * (1 - Y_TOP_MARGIN_FRACTION);

  function yForElevation(elevation: number): number {
    if (elevationSpan === 0) return midLineY;
    const heightAboveCanvasFloor =
      ((elevation - minElevation) / elevationSpan) * heightBelowTopMargin;
    return height - heightAboveCanvasFloor;
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
  const areaPolygonPoints = `${bottomLeftCorner} ${linePolylinePoints} ${bottomRightCorner}`;

  function yAt(distanceFraction: number): number {
    if (totalDistance === 0) {
      return yForElevation(firstSample.elevation);
    }
    const clamped = Math.max(0, Math.min(1, distanceFraction));
    if (clamped === 0) return yForElevation(firstSample.elevation);
    if (clamped === 1) return yForElevation(lastSample.elevation);
    const targetDistance = clamped * totalDistance;
    let previousSample = firstSample;
    let foundSample = lastSample;
    let isFoundSegment = false;
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
      isFoundSegment = true;
      break;
    }
    if (!isFoundSegment) return yForElevation(lastSample.elevation);
    const segmentSpan = foundSample.cumulative - previousSample.cumulative;
    const localFraction = (targetDistance - previousSample.cumulative) / segmentSpan;
    const interpolatedElevation =
      previousSample.elevation + (foundSample.elevation - previousSample.elevation) * localFraction;
    return yForElevation(interpolatedElevation);
  }

  return { areaPolygonPoints, linePolylinePoints, yAt, width, height };
}
