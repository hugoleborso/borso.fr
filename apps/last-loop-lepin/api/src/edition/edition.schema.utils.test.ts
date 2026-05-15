import { describe, expect, it } from 'vitest';
import { isMonotonicZeroToOne } from './edition.schema.utils';

describe('isMonotonicZeroToOne', () => {
  it('rejects an empty array', () => {
    expect(isMonotonicZeroToOne([])).toBe(false);
  });

  it('rejects a single-element array (no usable spread)', () => {
    expect(isMonotonicZeroToOne([0])).toBe(false);
  });

  it('rejects an array that does not start at 0', () => {
    expect(isMonotonicZeroToOne([0.1, 1])).toBe(false);
  });

  it('rejects an array that does not end at 1', () => {
    expect(isMonotonicZeroToOne([0, 0.9])).toBe(false);
  });

  it('accepts a strictly-increasing two-element series', () => {
    expect(isMonotonicZeroToOne([0, 1])).toBe(true);
  });

  it('accepts a uniform-cadence series', () => {
    expect(isMonotonicZeroToOne([0, 0.25, 0.5, 0.75, 1])).toBe(true);
  });

  it('accepts a non-uniform series modelling a pause', () => {
    expect(isMonotonicZeroToOne([0, 0.1, 0.9, 1])).toBe(true);
  });

  it('rejects a flat duplicate (zero-time span between two points)', () => {
    expect(isMonotonicZeroToOne([0, 0.5, 0.5, 1])).toBe(false);
  });

  it('rejects a non-monotonic series', () => {
    expect(isMonotonicZeroToOne([0, 0.5, 0.3, 1])).toBe(false);
  });

  it('rejects an array with NaN values inside', () => {
    expect(isMonotonicZeroToOne([0, Number.NaN, 1])).toBe(false);
  });
});
