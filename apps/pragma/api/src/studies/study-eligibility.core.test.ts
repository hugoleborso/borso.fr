import type { Lineup } from '@domain/lineup.core';
import { describe, expect, it } from 'vitest';
import { instrumentsHeldInAnyLineup } from './study-eligibility.core';

const LINEUPS: readonly Lineup[] = [
  { hugo: ['guitar'] },
  { hugo: ['voice', 'guitar'], lea: ['drums'] },
];

// @FollowsBlueprint test-pure-unit
describe('study-eligibility.core', () => {
  it('lists every instrument held once', () => {
    expect(instrumentsHeldInAnyLineup(LINEUPS, 'hugo')).toEqual(['guitar', 'voice']);
    expect(instrumentsHeldInAnyLineup(LINEUPS, 'nobody')).toEqual([]);
  });
});
