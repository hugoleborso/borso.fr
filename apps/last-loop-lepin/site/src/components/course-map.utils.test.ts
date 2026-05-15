import { describe, expect, it } from 'vitest';
import type { LatLngDto } from '../domain/types';
import {
  type Indexed,
  indexTrack,
  metersBetween,
  projectFraction,
  projectFractionTimeAware,
  squaredDegrees,
} from './course-map.utils';

const SAMPLE_POINTS: readonly LatLngDto[] = [
  { lat: 45.5, lng: 5.78 },
  { lat: 45.51, lng: 5.79 },
  { lat: 45.52, lng: 5.8 },
  { lat: 45.53, lng: 5.81 },
];

function buildDistanceFractions(track: Indexed): number[] {
  if (track.total === 0) return track.points.map(() => 0);
  return track.cumulative.map((value) => value / track.total);
}

describe('squaredDegrees', () => {
  it('returns 0 for identical points', () => {
    const point: LatLngDto = { lat: 45, lng: 5 };
    expect(squaredDegrees(point, point)).toBe(0);
  });

  it('returns the squared sum of axis-wise deltas', () => {
    expect(squaredDegrees({ lat: 0, lng: 0 }, { lat: 3, lng: 4 })).toBe(25);
  });
});

describe('metersBetween', () => {
  it('returns 0 for identical points', () => {
    const point: LatLngDto = { lat: 45, lng: 5 };
    expect(metersBetween(point, point)).toBe(0);
  });

  it('returns a positive distance for distinct points', () => {
    expect(metersBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 })).toBeGreaterThan(0);
  });
});

describe('indexTrack', () => {
  it('returns total 0 and empty cumulative array for empty points', () => {
    const track = indexTrack([]);
    expect(track.total).toBe(0);
    expect(track.cumulative).toEqual([]);
  });

  it('returns total 0 for a single point', () => {
    const track = indexTrack([{ lat: 45, lng: 5 }]);
    expect(track.total).toBe(0);
    expect(track.cumulative).toEqual([0]);
  });

  it('accumulates distances over a multi-point track', () => {
    const track = indexTrack(SAMPLE_POINTS);
    expect(track.cumulative).toHaveLength(SAMPLE_POINTS.length);
    expect(track.total).toBeGreaterThan(0);
    expect(track.cumulative[0]).toBe(0);
    expect(track.cumulative[track.cumulative.length - 1]).toBe(track.total);
  });
});

describe('projectFraction', () => {
  it('returns {0, 0} for an empty track', () => {
    expect(projectFraction(indexTrack([]), 0.5)).toEqual({ lat: 0, lng: 0 });
  });

  it('returns the only point for a single-point track', () => {
    const point: LatLngDto = { lat: 45, lng: 5 };
    expect(projectFraction(indexTrack([point]), 0.7)).toEqual(point);
  });

  it('returns the first point at fraction 0', () => {
    const track = indexTrack(SAMPLE_POINTS);
    expect(projectFraction(track, 0)).toEqual(SAMPLE_POINTS[0]);
  });

  it('returns the last point at fraction 1', () => {
    const track = indexTrack(SAMPLE_POINTS);
    const result = projectFraction(track, 1);
    const last = SAMPLE_POINTS[SAMPLE_POINTS.length - 1];
    expect(result?.lat).toBeCloseTo(last?.lat ?? 0, 5);
    expect(result?.lng).toBeCloseTo(last?.lng ?? 0, 5);
  });

  it('clamps fractions outside [0, 1]', () => {
    const track = indexTrack(SAMPLE_POINTS);
    expect(projectFraction(track, -1)).toEqual(projectFraction(track, 0));
    expect(projectFraction(track, 2)).toEqual(projectFraction(track, 1));
  });

  it('interpolates between two points at the midpoint', () => {
    const track = indexTrack([
      { lat: 0, lng: 0 },
      { lat: 10, lng: 20 },
    ]);
    const mid = projectFraction(track, 0.5);
    expect(mid.lat).toBeCloseTo(5, 5);
    expect(mid.lng).toBeCloseTo(10, 5);
  });

  it('handles a degenerate zero-length segment (duplicated points)', () => {
    // Two duplicates followed by a real segment force segmentLength === 0
    // on the first cursor pass. The function should return the start point.
    const track = indexTrack([
      { lat: 45, lng: 5 },
      { lat: 45, lng: 5 },
      { lat: 45.001, lng: 5.001 },
    ]);
    const result = projectFraction(track, 0);
    expect(result).toEqual({ lat: 45, lng: 5 });
  });

  it('handles a track of duplicated points (total === 0) by returning the first', () => {
    const point: LatLngDto = { lat: 45, lng: 5 };
    const track = indexTrack([point, point, point]);
    expect(track.total).toBe(0);
    expect(projectFraction(track, 0.5)).toEqual(point);
  });
});

describe('projectFractionTimeAware', () => {
  it('returns {0, 0} for an empty track', () => {
    expect(projectFractionTimeAware(indexTrack([]), 0.5, [0, 1])).toEqual({ lat: 0, lng: 0 });
  });

  it('returns the only point for a single-point track', () => {
    const point: LatLngDto = { lat: 45, lng: 5 };
    expect(projectFractionTimeAware(indexTrack([point]), 0.7, [0])).toEqual(point);
  });

  it('degenerate: when pointTimeFractions == distanceFractions, output matches projectFraction', () => {
    const track = indexTrack(SAMPLE_POINTS);
    const distanceFractions = buildDistanceFractions(track);
    for (const probe of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const linear = projectFraction(track, probe);
      const timeAware = projectFractionTimeAware(track, probe, distanceFractions);
      expect(timeAware.lat).toBeCloseTo(linear.lat, 9);
      expect(timeAware.lng).toBeCloseTo(linear.lng, 9);
    }
  });

  it('uphill-first profile: at timeFraction 0.5, the runner has only covered ~10% of the distance', () => {
    // 4 evenly-spaced points; time fractions skewed: 0..0.9 covers points 0..1
    // (slow uphill), then 0.9..1 covers points 1..3 (fast downhill).
    const track = indexTrack(SAMPLE_POINTS);
    const pointTimeFractions: ReadonlyArray<number> = [0, 0.9, 0.95, 1];
    const position = projectFractionTimeAware(track, 0.5, pointTimeFractions);
    const first = SAMPLE_POINTS[0] ?? { lat: 0, lng: 0 };
    const second = SAMPLE_POINTS[1] ?? first;
    // At fraction 0.5, segmentIndex resolves to 0 (since 0 <= 0.5 < 0.9), and
    // localFraction = (0.5 - 0) / (0.9 - 0) = 0.5555…
    const expectedLocal = (0.5 - 0) / (0.9 - 0);
    expect(position.lat).toBeCloseTo(first.lat + (second.lat - first.lat) * expectedLocal, 6);
    expect(position.lng).toBeCloseTo(first.lng + (second.lng - first.lng) * expectedLocal, 6);
  });

  it('downhill-first profile: at timeFraction 0.5, the runner has covered ~90% of the distance', () => {
    // Mirror profile: fast first half, slow second half.
    const track = indexTrack(SAMPLE_POINTS);
    const pointTimeFractions: ReadonlyArray<number> = [0, 0.05, 0.1, 1];
    const position = projectFractionTimeAware(track, 0.5, pointTimeFractions);
    const third = SAMPLE_POINTS[2] ?? { lat: 0, lng: 0 };
    const fourth = SAMPLE_POINTS[3] ?? third;
    // segmentIndex resolves to 2 (since 0.1 <= 0.5 < 1.0)
    const expectedLocal = (0.5 - 0.1) / (1 - 0.1);
    expect(position.lat).toBeCloseTo(third.lat + (fourth.lat - third.lat) * expectedLocal, 6);
    expect(position.lng).toBeCloseTo(third.lng + (fourth.lng - third.lng) * expectedLocal, 6);
  });

  it('single-segment track: linearly interpolates inside [0, 1]', () => {
    const track = indexTrack([
      { lat: 0, lng: 0 },
      { lat: 10, lng: 20 },
    ]);
    const mid = projectFractionTimeAware(track, 0.5, [0, 1]);
    expect(mid.lat).toBeCloseTo(5, 6);
    expect(mid.lng).toBeCloseTo(10, 6);
  });

  it('returns the exact boundary point at each pointTimeFractions[i]', () => {
    const track = indexTrack(SAMPLE_POINTS);
    const pointTimeFractions: ReadonlyArray<number> = [0, 0.3, 0.7, 1];
    for (let index = 0; index < SAMPLE_POINTS.length; index += 1) {
      const expectedPoint = SAMPLE_POINTS[index];
      const probe = pointTimeFractions[index];
      if (expectedPoint === undefined || probe === undefined) continue;
      const position = projectFractionTimeAware(track, probe, pointTimeFractions);
      expect(position.lat).toBeCloseTo(expectedPoint.lat, 9);
      expect(position.lng).toBeCloseTo(expectedPoint.lng, 9);
    }
  });

  it('clamps fraction outside [0, 1]', () => {
    const track = indexTrack(SAMPLE_POINTS);
    const pointTimeFractions: ReadonlyArray<number> = [0, 0.3, 0.7, 1];
    const first = SAMPLE_POINTS[0] ?? { lat: 0, lng: 0 };
    const last = SAMPLE_POINTS[SAMPLE_POINTS.length - 1] ?? first;
    const below = projectFractionTimeAware(track, -1, pointTimeFractions);
    const above = projectFractionTimeAware(track, 2, pointTimeFractions);
    expect(below.lat).toBeCloseTo(first.lat, 9);
    expect(below.lng).toBeCloseTo(first.lng, 9);
    expect(above.lat).toBeCloseTo(last.lat, 9);
    expect(above.lng).toBeCloseTo(last.lng, 9);
  });

  it('handles a zero-span segment between adjacent fractions', () => {
    // Adjacent duplicated fractions (rejected by the Zod refine in
    // practice, but the function survives them) — the lockstep walk
    // breaks on the first match at index 1.
    const track = indexTrack(SAMPLE_POINTS);
    const pointTimeFractions: ReadonlyArray<number> = [0, 0.5, 0.5, 1];
    const position = projectFractionTimeAware(track, 0.5, pointTimeFractions);
    expect(position).toEqual(SAMPLE_POINTS[1]);
  });

  it('returns the last walked point when pointTimeFractions is shorter than points (degenerate input)', () => {
    // Length parity is enforced by Zod at the read boundary; this case
    // exists only when callers bypass it. The iterator runs dry and we
    // return the last segment-end we saw.
    const track = indexTrack(SAMPLE_POINTS);
    const pointTimeFractions: ReadonlyArray<number> = [0, 0.5];
    const position = projectFractionTimeAware(track, 1, pointTimeFractions);
    expect(position).toEqual(SAMPLE_POINTS[1]);
  });

  it('handles a zero-span at the very start (duplicated ptf[0])', () => {
    // ptf[1] === 0 forces the first segment to have zero span — the
    // `segmentSpan === 0 ? 0 : …` branch returns the previous point.
    const track = indexTrack(SAMPLE_POINTS);
    const pointTimeFractions: ReadonlyArray<number> = [0, 0, 0.5, 1];
    const position = projectFractionTimeAware(track, 0, pointTimeFractions);
    expect(position).toEqual(SAMPLE_POINTS[0]);
  });
});
