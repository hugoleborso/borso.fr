import type { Lineup } from '@domain/lineup.core';
import { describe, expect, it } from 'vitest';
import { hasInstrumentInAnyLineup, instrumentsHeldInAnyLineup } from './study-eligibility.core';

const LINEUPS: readonly Lineup[] = [
  { hugo: ['guitar'] },
  { hugo: ['voice', 'guitar'], lea: ['drums'] },
];

// @FollowsBlueprint test-pure-unit
describe('study-eligibility.core', () => {
  it('accepts an instrument held in any lineup, including an override', () => {
    expect(hasInstrumentInAnyLineup(LINEUPS, 'hugo', 'voice')).toBe(true);
  });

  it('refuses an instrument the member holds in no lineup', () => {
    expect(hasInstrumentInAnyLineup(LINEUPS, 'hugo', 'drums')).toBe(false);
    expect(hasInstrumentInAnyLineup(LINEUPS, 'nobody', 'guitar')).toBe(false);
  });

  it('lists every instrument held once', () => {
    expect(instrumentsHeldInAnyLineup(LINEUPS, 'hugo')).toEqual(['guitar', 'voice']);
    expect(instrumentsHeldInAnyLineup(LINEUPS, 'nobody')).toEqual([]);
  });
});
