import { describe, expect, it } from 'vitest';
import { buildSparklinePath } from './energy-sparkline.utils';

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

  it('uses the energy midpoint when a value is null or undefined', () => {
    const geometry = buildSparklinePath([null, undefined], 80, 40);
    const lows = geometry.points.map((point) => point[1]);
    // Both fall back to value=5 — same y-coord for both points.
    expect(lows[0]).toBe(lows[1]);
  });

  it('respects the vertical padding (top/bottom inset of 6)', () => {
    const geometry = buildSparklinePath([10], 100, 50);
    const firstPoint = geometry.points[0];
    if (firstPoint === undefined) throw new Error('expected one point');
    // Max energy → y = height - 6 - (10/10) * (height - 12) = 50-6-38 = 6.
    expect(firstPoint[1]).toBe(6);
  });
});
