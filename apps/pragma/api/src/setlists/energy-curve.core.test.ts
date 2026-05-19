import { describe, expect, it } from 'vitest';
import {
  BASELINE_ENERGY,
  MAX_ENERGY,
  MIN_ENERGY,
  isValidEnergy,
  peakIndex,
  smoothedSeries,
} from './energy-curve.core';

describe('energy-curve.core', () => {
  describe('smoothedSeries', () => {
    it('returns only the baseline anchor for an empty list', () => {
      expect(smoothedSeries([])).toEqual([{ index: 0, value: BASELINE_ENERGY, gap: false }]);
    });

    it('emits N+1 points for N entries', () => {
      expect(smoothedSeries([3, 5, 7])).toEqual([
        { index: 0, value: BASELINE_ENERGY, gap: false },
        { index: 1, value: 3, gap: false },
        { index: 2, value: 5, gap: false },
        { index: 3, value: 7, gap: false },
      ]);
    });

    it('flags null entries with gap=true', () => {
      expect(smoothedSeries([3, null, 7])).toEqual([
        { index: 0, value: BASELINE_ENERGY, gap: false },
        { index: 1, value: 3, gap: false },
        { index: 2, value: BASELINE_ENERGY, gap: true },
        { index: 3, value: 7, gap: false },
      ]);
    });

    it('treats an all-null list as all gaps after the baseline', () => {
      expect(smoothedSeries([null, null])).toEqual([
        { index: 0, value: BASELINE_ENERGY, gap: false },
        { index: 1, value: BASELINE_ENERGY, gap: true },
        { index: 2, value: BASELINE_ENERGY, gap: true },
      ]);
    });
  });

  describe('peakIndex', () => {
    it('returns null for an empty list', () => {
      expect(peakIndex([])).toBeNull();
    });

    it('returns null for an all-null list', () => {
      expect(peakIndex([null, null])).toBeNull();
    });

    it('returns the index of the maximum value', () => {
      expect(peakIndex([3, 9, 7])).toBe(1);
    });

    it('returns the first index on ties (strict greater wins)', () => {
      expect(peakIndex([5, 5, 5])).toBe(0);
    });

    it('skips null entries when picking the peak', () => {
      expect(peakIndex([null, 8, null, 3])).toBe(1);
    });
  });

  describe('isValidEnergy', () => {
    it('accepts the minimum value', () => {
      expect(isValidEnergy(MIN_ENERGY)).toBe(true);
    });

    it('accepts the maximum value', () => {
      expect(isValidEnergy(MAX_ENERGY)).toBe(true);
    });

    it('rejects values below the minimum', () => {
      expect(isValidEnergy(MIN_ENERGY - 1)).toBe(false);
    });

    it('rejects values above the maximum', () => {
      expect(isValidEnergy(MAX_ENERGY + 1)).toBe(false);
    });

    it('rejects non-integers', () => {
      expect(isValidEnergy(5.5)).toBe(false);
    });
  });
});
