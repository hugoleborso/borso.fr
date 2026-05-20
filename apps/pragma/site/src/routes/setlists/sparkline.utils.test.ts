import { describe, expect, it } from 'vitest';
import { sparklinePath } from './sparkline.utils';

const STANDARD_GEOMETRY = { width: 320, height: 48, padding: 4 } as const;

describe('sparklinePath', () => {
  it('still draws the baseline anchor when there are no entries', () => {
    // smoothedSeries always inserts the BASELINE_ENERGY anchor at
    // index 0, so even an empty entry array yields one path point.
    const path = sparklinePath([], STANDARD_GEOMETRY);
    expect(path).toMatch(/^M /);
    expect(path).not.toContain('L ');
  });

  it('starts every series with an absolute `M` and continues with `L`', () => {
    const path = sparklinePath([5, 6, 7], STANDARD_GEOMETRY);
    expect(path.startsWith('M ')).toBe(true);
    expect(path).toContain('L ');
  });

  it('inserts an `M` after a gap so the renderer breaks the line', () => {
    const path = sparklinePath([5, null, 5], STANDARD_GEOMETRY);
    // After the baseline (point 0) and the first energy point (point 1),
    // the gap forces the next two points to start with `M`.
    expect(path.match(/M /g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a single-value series with a single `M` and a single `L`', () => {
    const path = sparklinePath([7], STANDARD_GEOMETRY);
    const matchM = path.match(/M /g) ?? [];
    const matchL = path.match(/L /g) ?? [];
    expect(matchM.length).toBe(1);
    expect(matchL.length).toBe(1);
  });

  it('scales the y coordinate inversely with the value (smaller y = higher energy)', () => {
    const lowPath = sparklinePath([1], { width: 100, height: 100, padding: 0 });
    const highPath = sparklinePath([10], { width: 100, height: 100, padding: 0 });
    const lowY = Number.parseFloat(lowPath.split(' ')[5] ?? '0');
    const highY = Number.parseFloat(highPath.split(' ')[5] ?? '0');
    expect(highY).toBeLessThan(lowY);
  });

  it('handles all-null series — every point is a gap', () => {
    const path = sparklinePath([null, null, null], STANDARD_GEOMETRY);
    const matchM = path.match(/M /g) ?? [];
    // baseline (no gap) + 3 null entries (each a gap) = 4 segments.
    expect(matchM.length).toBe(4);
  });
});
