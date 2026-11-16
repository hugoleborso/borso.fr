import { describe, expect, it } from 'vitest';
import { SLOW_BURN_CHORD_CHART } from './test-seed-charts.core';

const chartLines = SLOW_BURN_CHORD_CHART.split('\n');
const CHORD_ONLY_LINE = /^(\[[^\]]+\]\s*)+$/;

// @FollowsBlueprint test-pure-unit
describe('the seeded Slow Burn chart', () => {
  it('holds every kind of line the chart viewer draws, so a validator needs no hand-typed chart', () => {
    expect(chartLines).toContain('{start_of_verse}');
    expect(chartLines).toContain('{start_of_chorus}');
    expect(chartLines).toContain('{start_of_tab}');
    expect(chartLines).toContain('{end_of_tab}');
    expect(chartLines.some((line) => line.startsWith('{comment:'))).toBe(true);
    expect(chartLines.some((line) => CHORD_ONLY_LINE.test(line))).toBe(true);
  });
});
