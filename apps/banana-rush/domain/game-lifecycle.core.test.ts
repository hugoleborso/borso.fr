import { describe, expect, it } from 'vitest';
import { MINIMUM_SEATS } from './game-setup.core';
import { refuseStart } from './game-lifecycle.core';

// @FollowsBlueprint test-pure-unit
describe('refuseStart', () => {
  it('allows a lobby holding the minimum number of players', () => {
    expect(refuseStart('lobby', MINIMUM_SEATS)).toBeNull();
  });

  it('refuses a game that is already running', () => {
    expect(refuseStart('playing', 4)).toBe('not-in-lobby');
  });

  it('refuses a lobby one player short of the minimum', () => {
    expect(refuseStart('lobby', MINIMUM_SEATS - 1)).toBe('not-enough-players');
  });
});
