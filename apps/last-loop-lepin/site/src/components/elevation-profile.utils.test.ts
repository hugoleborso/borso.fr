import { describe, expect, it } from 'vitest';
import { buildProfileGeometry } from './elevation-profile.utils';

const PROFILE_WIDTH = 200;
const PROFILE_HEIGHT = 100;

describe('buildProfileGeometry', () => {
  it('returns a degenerate geometry for an empty elevations series', () => {
    // Defensive: the caller renders the placeholder before invoking the
    // helper, but if a future call site forgets the guard, the SVG should
    // still be well-formed (no NaN coords).
    const geometry = buildProfileGeometry([], [], PROFILE_WIDTH, PROFILE_HEIGHT);
    expect(geometry.areaPolygonPoints).toBe(`0,${PROFILE_HEIGHT} ${PROFILE_WIDTH},${PROFILE_HEIGHT}`);
    expect(geometry.linePolylinePoints).toBe('');
    expect(geometry.yAt(0)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(0.5)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.width).toBe(PROFILE_WIDTH);
    expect(geometry.height).toBe(PROFILE_HEIGHT);
  });

  it('flat profile: every Y collapses to height/2 (no divide-by-zero)', () => {
    const geometry = buildProfileGeometry(
      [100, 100, 100],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    expect(geometry.yAt(0)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(0.5)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(1)).toBe(PROFILE_HEIGHT / 2);
    // Every Y in the polyline is height/2.
    const yCoords = geometry.linePolylinePoints
      .split(' ')
      .map((pair) => Number.parseFloat(pair.split(',')[1] ?? '0'));
    for (const y of yCoords) {
      expect(y).toBe(PROFILE_HEIGHT / 2);
    }
  });

  it('monotonic climb: yAt(0) is the floor, yAt(1) is the top-margin ceiling', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    // The lowest elevation lands at y = height (canvas floor); the
    // highest lands at y = height × Y_TOP_MARGIN_FRACTION (5 % from top).
    expect(geometry.yAt(0)).toBeCloseTo(PROFILE_HEIGHT, 5);
    expect(geometry.yAt(1)).toBeCloseTo(PROFILE_HEIGHT * 0.05, 5);
  });

  it('V-shape: yAt(0.5) hits the bottom of the V (lowest elevation)', () => {
    const geometry = buildProfileGeometry(
      [300, 100, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    // The dip at fraction 0.5 reaches the minimum elevation → y = height
    // (canvas floor, since canvas Y is inverted).
    expect(geometry.yAt(0.5)).toBeCloseTo(PROFILE_HEIGHT, 5);
  });

  it('large N (50 points): the area polygon has N + 2 vertices (bottom-left, samples, bottom-right)', () => {
    const elevations: number[] = [];
    const cumulative: number[] = [];
    for (let index = 0; index < 50; index += 1) {
      // Sine-ish profile so min ≠ max.
      elevations.push(400 + Math.sin(index / 5) * 100);
      cumulative.push(index * 100);
    }
    const geometry = buildProfileGeometry(elevations, cumulative, PROFILE_WIDTH, PROFILE_HEIGHT);
    const vertexCount = geometry.areaPolygonPoints.split(' ').length;
    expect(vertexCount).toBe(elevations.length + 2);
  });

  it('yAt(0) returns the y of the first elevation sample', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    // First sample y for elevation 100 (the minimum) is the canvas floor.
    expect(geometry.yAt(0)).toBeCloseTo(PROFILE_HEIGHT, 5);
  });

  it('yAt(1) returns the y of the last elevation sample', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    expect(geometry.yAt(1)).toBeCloseTo(PROFILE_HEIGHT * 0.05, 5);
  });

  it('yAt(midpoint) lerps between the two surrounding samples', () => {
    // 3 evenly-spaced samples [100, 200, 300]; fraction 0.25 lands halfway
    // between sample 0 and 1 → interpolated elevation = 150.
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    // Elevation 150 in a [100, 300] span → normalised 0.25.
    const usableHeight = PROFILE_HEIGHT * (1 - 0.05);
    const expectedY = PROFILE_HEIGHT - 0.25 * usableHeight;
    expect(geometry.yAt(0.25)).toBeCloseTo(expectedY, 5);
  });

  it('clamps fraction outside [0, 1]', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    expect(geometry.yAt(-1)).toBeCloseTo(geometry.yAt(0), 9);
    expect(geometry.yAt(2)).toBeCloseTo(geometry.yAt(1), 9);
  });

  it('single-point series: yAt always returns the only sample y', () => {
    const geometry = buildProfileGeometry([500], [0], PROFILE_WIDTH, PROFILE_HEIGHT);
    // With elevationSpan === 0 (single sample equals itself), Y collapses
    // to mid-line.
    expect(geometry.yAt(0)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(0.5)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(1)).toBe(PROFILE_HEIGHT / 2);
  });

  it('zero-length track (cumulative all zero): yAt returns the first sample y', () => {
    // Degenerate input — every sample sits at distance 0. The helper
    // shouldn't divide by zero; it returns the first sample's y.
    const geometry = buildProfileGeometry([100, 200], [0, 0], PROFILE_WIDTH, PROFILE_HEIGHT);
    // elevationSpan = 100 ≠ 0, so we take the "first sample y" branch.
    expect(geometry.yAt(0.5)).toBeCloseTo(PROFILE_HEIGHT, 5);
  });

  it('handles cumulativeDistances shorter than pointElevations (degenerate input)', () => {
    // Defensive against length mismatch (the Zod refine forbids this at
    // the API boundary, but the helper is also called directly from the
    // unit test and the React shell). The zip truncates at the shorter
    // input; the rest of the elevations are dropped.
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    // Two samples retained → polyline has 2 vertices.
    expect(geometry.linePolylinePoints.split(' ')).toHaveLength(2);
  });

  it('non-monotonic cumulative: yAt falls back to the last sample when no segment matches', () => {
    // A pathological input where cumulative decreases after the first
    // sample. `totalDistance = max(cumulative) = 100` (from the first
    // sample), but no later sample has cumulative >= targetDistance for
    // a fraction near 1 → `foundSegment` stays false, the helper returns
    // the y of the last sample.
    const geometry = buildProfileGeometry(
      [100, 300, 500],
      [100, 50, 25],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    // Fraction 0.9 → targetDistance = 90; later cumulatives are 50 and
    // 25, both < 90 → fallback path. yForElevation(500) is the canvas
    // ceiling minus margin.
    const fallback = geometry.yAt(0.9);
    expect(Number.isFinite(fallback)).toBe(true);
    // Also exercises the `< targetDistance` truthy branch (twice).
    expect(fallback).toBeCloseTo(PROFILE_HEIGHT * 0.05, 5);
  });
});
