import { describe, expect, it } from 'vitest';
import { normalizeChartLabel } from './chart-label.core';

// @FollowsBlueprint test-pure-unit
describe('normalizeChartLabel', () => {
  it('stores a blank label as no label', () => {
    expect(normalizeChartLabel('')).toBeNull();
    expect(normalizeChartLabel('   ')).toBeNull();
    expect(normalizeChartLabel(null)).toBeNull();
  });

  it('keeps a label without the spaces around it', () => {
    expect(normalizeChartLabel(' Solo ')).toBe('Solo');
  });
});
