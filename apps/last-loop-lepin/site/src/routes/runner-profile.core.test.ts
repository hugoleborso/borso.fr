import { describe, expect, it } from 'vitest';
import { formatCurrentRank, isLoadingRunnerProfile } from './runner-profile.core';

describe('isLoadingRunnerProfile', () => {
  it('is not loading once the request failed', () => {
    expect(isLoadingRunnerProfile(true, false)).toBe(false);
  });

  it('is loading while the runner has not arrived', () => {
    expect(isLoadingRunnerProfile(false, false)).toBe(true);
  });

  it('is not loading once the runner has arrived', () => {
    expect(isLoadingRunnerProfile(false, true)).toBe(false);
  });
});

describe('formatCurrentRank', () => {
  it('shows the empty label for a runner absent from the standings', () => {
    expect(formatCurrentRank(undefined, 'ex aequo', '—')).toBe('—');
  });

  it('shows the tie label for a tied runner', () => {
    expect(formatCurrentRank('ex-aequo', 'ex aequo', '—')).toBe('ex aequo');
  });

  it('shows a numeric rank as a number', () => {
    expect(formatCurrentRank(4, 'ex aequo', '—')).toBe('4');
  });
});
