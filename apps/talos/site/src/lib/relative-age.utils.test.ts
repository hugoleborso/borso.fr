import { describe, expect, it } from 'vitest';
import { measureAge } from './relative-age.utils';

const NOW = Date.parse('2026-10-09T12:00:00+02:00');

describe('measureAge', () => {
  it('counts minutes under an hour, never below zero', () => {
    expect(measureAge('2026-10-09T11:35:30+02:00', NOW)).toEqual({ unit: 'minutes', value: 24 });
    expect(measureAge('2026-10-09T12:05:00+02:00', NOW)).toEqual({ unit: 'minutes', value: 0 });
  });

  it('counts hours up to two days, then days', () => {
    expect(measureAge('2026-10-09T07:00:00+02:00', NOW)).toEqual({ unit: 'hours', value: 5 });
    expect(measureAge('2026-10-09T11:00:00+02:00', NOW)).toEqual({ unit: 'hours', value: 1 });
    expect(measureAge('2026-10-07T12:00:01+02:00', NOW)).toEqual({ unit: 'hours', value: 47 });
    expect(measureAge('2026-10-07T12:00:00+02:00', NOW)).toEqual({ unit: 'days', value: 2 });
  });

  it('answers null for a date it cannot read', () => {
    expect(measureAge('hier', NOW)).toBeNull();
  });
});
