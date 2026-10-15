import { describe, expect, it } from 'vitest';
import { BAND_TIME_ZONE } from './band-time-zone.core';

// @FollowsBlueprint test-pure-unit
describe('BAND_TIME_ZONE', () => {
  it('names an IANA zone the runtime knows, so both sides format and compute in it', () => {
    expect(() => new Intl.DateTimeFormat('en', { timeZone: BAND_TIME_ZONE })).not.toThrow();
    expect(BAND_TIME_ZONE).toBe('Europe/Paris');
  });
});
