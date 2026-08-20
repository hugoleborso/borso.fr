import { describe, expect, it } from 'vitest';
import { buildSparklinePath } from './energy-sparkline.utils';

// @FollowsBlueprint test-pure-unit
describe('buildSparklinePath', () => {
  it('returns an empty geometry for an empty list', () => {
    const geometry = buildSparklinePath([], 100, 50);
    expect(geometry.path).toBe('');
    expect(geometry.points).toEqual([]);
  });

  it('emits a single moveTo for one value, centered horizontally', () => {
    const geometry = buildSparklinePath([5], 100, 50);
    expect(geometry.points).toEqual([[50, 25]]);
    expect(geometry.path).toBe('M 50 25');
  });

  it('chains quadratic segments for multiple values', () => {
    const geometry = buildSparklinePath([1, 10], 100, 50);
    expect(geometry.points).toHaveLength(2);
    const firstPoint = geometry.points[0];
    const secondPoint = geometry.points[1];
    if (firstPoint === undefined || secondPoint === undefined) {
      throw new Error('expected two points');
    }
    expect(firstPoint[0]).toBe(0);
    expect(secondPoint[0]).toBe(100);
    expect(geometry.path.startsWith('M 0 ')).toBe(true);
    expect(geometry.path).toContain(' Q 0 ');
    expect(geometry.path).toContain(' T 100 ');
  });

  it('spaces three values evenly and joins them through their midpoints', () => {
    const geometry = buildSparklinePath([2, 8, 5], 100, 50);
    expect(geometry.points).toEqual([
      [0, 36.4],
      [50, 13.599999999999998],
      [100, 25],
    ]);
    expect(geometry.path).toBe(
      'M 0 36.4 Q 0 36.4 25 25 T 50 13.599999999999998 Q 50 13.599999999999998 75 19.299999999999997 T 100 25',
    );
  });

  it('uses the energy midpoint when a value is null or undefined', () => {
    const geometry = buildSparklinePath([null, undefined], 80, 40);
    const yCoordinatesOfUnsetValues = geometry.points.map((point) => point[1]);
    expect(yCoordinatesOfUnsetValues[0]).toBe(yCoordinatesOfUnsetValues[1]);
  });

  it('draws the highest energy at the top vertical inset', () => {
    const VERTICAL_INSET = 6;
    const HIGHEST_ENERGY = 10;
    const geometry = buildSparklinePath([HIGHEST_ENERGY], 100, 50);
    const firstPoint = geometry.points[0];
    if (firstPoint === undefined) throw new Error('expected one point');
    expect(firstPoint[1]).toBe(VERTICAL_INSET);
  });
});
