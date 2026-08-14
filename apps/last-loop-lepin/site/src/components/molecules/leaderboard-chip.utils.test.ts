import { describe, expect, it } from 'vitest';
import { formatLastEventTime, formatRank } from './leaderboard-chip.utils';

// @FollowsBlueprint test-pure-unit
describe('formatRank', () => {
  it('prints a numeric rank as a number', () => {
    expect(formatRank(3, '=')).toBe('3');
  });

  it('prints the supplied label for a tied rank', () => {
    expect(formatRank('ex-aequo', '=')).toBe('=');
  });
});

describe('formatLastEventTime', () => {
  it('returns the empty label for a runner who never crossed the line', () => {
    expect(formatLastEventTime(null, 'fr-FR', '—')).toBe('—');
  });

  it('formats the recorded instant in the given locale', () => {
    const instant = new Date(2026, 5, 13, 7, 30, 5).toISOString();
    expect(formatLastEventTime(instant, 'fr-FR', '—')).toBe('07:30:05');
  });
});
