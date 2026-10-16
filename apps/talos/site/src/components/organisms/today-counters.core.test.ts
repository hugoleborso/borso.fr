import { describe, expect, it } from 'vitest';
import { keepNonZeroCounters } from './today-counters.core';

describe('keepNonZeroCounters', () => {
  it('hides the counters at zero and keeps the plain shortcuts', () => {
    expect(
      keepNonZeroCounters([
        { key: 'proposals', count: 0 },
        { key: 'owed', count: 2 },
        { key: 'history' },
      ]),
    ).toEqual([{ key: 'owed', count: 2 }, { key: 'history' }]);
  });
});
