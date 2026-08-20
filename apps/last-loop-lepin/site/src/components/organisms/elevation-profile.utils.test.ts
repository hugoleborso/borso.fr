import { describe, expect, it } from 'vitest';
import { buildProfileGeometry } from './elevation-profile.utils';

const PROFILE_WIDTH = 200;
const PROFILE_HEIGHT = 100;

// @FollowsBlueprint test-pure-unit
describe('buildProfileGeometry', () => {
  it('returns a well-formed baseline geometry with no NaN coordinates for an empty series', () => {
    const geometry = buildProfileGeometry([], [], PROFILE_WIDTH, PROFILE_HEIGHT);
    expect(geometry.areaPolygonPoints).toBe(
      `0,${PROFILE_HEIGHT} ${PROFILE_WIDTH},${PROFILE_HEIGHT}`,
    );
    expect(geometry.linePolylinePoints).toBe('');
    expect(geometry.yAt(0)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(0.5)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.width).toBe(PROFILE_WIDTH);
    expect(geometry.height).toBe(PROFILE_HEIGHT);
  });

  it('flat profile: every Y, in yAt and in the polyline alike, collapses to height/2 (no divide-by-zero)', () => {
    const geometry = buildProfileGeometry(
      [100, 100, 100],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    expect(geometry.yAt(0)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(0.5)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(1)).toBe(PROFILE_HEIGHT / 2);
    const yCoords = geometry.linePolylinePoints
      .split(' ')
      .map((pair) => Number.parseFloat(pair.split(',')[1] ?? '0'));
    for (const y of yCoords) {
      expect(y).toBe(PROFILE_HEIGHT / 2);
    }
  });

  it('monotonic climb: the lowest elevation lands on the canvas floor and the highest 5 % below the top', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    expect(geometry.yAt(0)).toBeCloseTo(PROFILE_HEIGHT, 5);
    expect(geometry.yAt(1)).toBeCloseTo(PROFILE_HEIGHT * 0.05, 5);
  });

  it('V-shape: yAt(0.5) hits the lowest elevation at the canvas floor, SVG Y being inverted', () => {
    const geometry = buildProfileGeometry(
      [300, 100, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    expect(geometry.yAt(0.5)).toBeCloseTo(PROFILE_HEIGHT, 5);
  });

  it('large N: a 50-sample sine profile, whose min differs from its max, yields N + 2 polygon vertices (bottom-left, samples, bottom-right)', () => {
    const elevations: number[] = [];
    const cumulative: number[] = [];
    for (let index = 0; index < 50; index += 1) {
      elevations.push(400 + Math.sin(index / 5) * 100);
      cumulative.push(index * 100);
    }
    const geometry = buildProfileGeometry(elevations, cumulative, PROFILE_WIDTH, PROFILE_HEIGHT);
    const vertexCount = geometry.areaPolygonPoints.split(' ').length;
    expect(vertexCount).toBe(elevations.length + 2);
  });

  it('yAt(0) returns the y of the first elevation sample, the canvas floor when it is the minimum', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
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

  it('yAt(0.25) lerps to elevation 150, halfway between the two surrounding samples of [100, 200, 300]', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    const usableHeight = PROFILE_HEIGHT * (1 - 0.05);
    const normalisedFor150 = 0.25;
    const expectedY = PROFILE_HEIGHT - normalisedFor150 * usableHeight;
    expect(geometry.yAt(0.25)).toBeCloseTo(expectedY, 5);
  });

  it('yAt(0.75) lerps to elevation 250 from the sample before it, not from the start of the track', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    const usableHeight = PROFILE_HEIGHT * (1 - 0.05);
    const normalisedFor250 = 0.75;
    const expectedY = PROFILE_HEIGHT - normalisedFor250 * usableHeight;
    expect(geometry.yAt(0.75)).toBeCloseTo(expectedY, 5);
  });

  it('spreads the samples across the full width', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 300],
      [0, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    const xCoords = geometry.linePolylinePoints
      .split(' ')
      .map((pair) => Number.parseFloat(pair.split(',')[0] ?? ''));
    expect(xCoords).toEqual([0, PROFILE_WIDTH / 2, PROFILE_WIDTH]);
  });

  it('pins every sample of a zero-length track at x = 0 rather than NaN', () => {
    const geometry = buildProfileGeometry([100, 200], [0, 0], PROFILE_WIDTH, PROFILE_HEIGHT);
    const xCoords = geometry.linePolylinePoints
      .split(' ')
      .map((pair) => Number.parseFloat(pair.split(',')[0] ?? ''));
    expect(xCoords).toEqual([0, 0]);
  });

  it('takes the first sample reaching the target when several share a distance, so 0.5 reads 200 and not 400', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 400, 300],
      [0, 50, 50, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    const usableHeight = PROFILE_HEIGHT * (1 - 0.05);
    const normalisedFor200 = (200 - 100) / (400 - 100);
    expect(geometry.yAt(0.5)).toBeCloseTo(PROFILE_HEIGHT - normalisedFor200 * usableHeight, 5);
  });

  it('reads the very last sample at fraction 1 when the track ends on a repeated distance, so 1 reads 300 and not the 400 before it', () => {
    const geometry = buildProfileGeometry(
      [100, 200, 400, 300],
      [0, 50, 100, 100],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    const usableHeight = PROFILE_HEIGHT * (1 - 0.05);
    const normalisedFor300 = (300 - 100) / (400 - 100);
    expect(geometry.yAt(1)).toBeCloseTo(PROFILE_HEIGHT - normalisedFor300 * usableHeight, 5);
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

  it('single-point series: the elevation span is zero, so yAt always returns the mid-line', () => {
    const geometry = buildProfileGeometry([500], [0], PROFILE_WIDTH, PROFILE_HEIGHT);
    expect(geometry.yAt(0)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(0.5)).toBe(PROFILE_HEIGHT / 2);
    expect(geometry.yAt(1)).toBe(PROFILE_HEIGHT / 2);
  });

  it('zero-length track, every cumulative at 0: yAt returns the first sample y instead of dividing by zero', () => {
    const geometry = buildProfileGeometry([100, 200], [0, 0], PROFILE_WIDTH, PROFILE_HEIGHT);
    expect(geometry.yAt(0.5)).toBeCloseTo(PROFILE_HEIGHT, 5);
  });

  it('truncates at the shorter input when cumulativeDistances is shorter than pointElevations, dropping the trailing elevations', () => {
    const geometry = buildProfileGeometry([100, 200, 300], [0, 50], PROFILE_WIDTH, PROFILE_HEIGHT);
    expect(geometry.linePolylinePoints.split(' ')).toHaveLength(2);
  });

  it('non-monotonic cumulative: yAt falls back to the last sample when no later sample reaches the target distance', () => {
    const geometry = buildProfileGeometry(
      [100, 300, 500],
      [100, 50, 25],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    const fallback = geometry.yAt(0.9);
    expect(Number.isFinite(fallback)).toBe(true);
    expect(fallback).toBeCloseTo(PROFILE_HEIGHT * 0.05, 5);
  });

  it('non-monotonic cumulative: the fraction-0 short-circuit reads the first sample rather than extrapolating backwards to the last', () => {
    const geometry = buildProfileGeometry(
      [100, 300, 500],
      [100, 50, 25],
      PROFILE_WIDTH,
      PROFILE_HEIGHT,
    );
    expect(geometry.yAt(0)).toBeCloseTo(PROFILE_HEIGHT, 5);
  });
});
