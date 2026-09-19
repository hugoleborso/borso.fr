import { describe, expect, it } from 'vitest';
import { type GameSetup, MAXIMUM_SEATS, MINIMUM_SEATS, refuseGameSetup } from './game-setup.core';

const validSetup: GameSetup = { maxPlayers: 4, winningScore: 200, roundTimerSeconds: 60 };

// @FollowsBlueprint test-pure-unit
describe('refuseGameSetup', () => {
  it('accepts a setup inside every bound', () => {
    expect(refuseGameSetup(validSetup)).toBeNull();
  });

  it('accepts a game with no timer at all', () => {
    expect(refuseGameSetup({ ...validSetup, roundTimerSeconds: null })).toBeNull();
  });

  it('accepts the smallest and the largest table', () => {
    expect(refuseGameSetup({ ...validSetup, maxPlayers: MINIMUM_SEATS })).toBeNull();
    expect(refuseGameSetup({ ...validSetup, maxPlayers: MAXIMUM_SEATS })).toBeNull();
  });

  it('refuses a table with too few seats', () => {
    expect(refuseGameSetup({ ...validSetup, maxPlayers: MINIMUM_SEATS - 1 })).toBe(
      'seats-out-of-range',
    );
  });

  it('refuses a table with too many seats', () => {
    expect(refuseGameSetup({ ...validSetup, maxPlayers: MAXIMUM_SEATS + 1 })).toBe(
      'seats-out-of-range',
    );
  });

  it('refuses a seat count that is not a whole number', () => {
    expect(refuseGameSetup({ ...validSetup, maxPlayers: 4.5 })).toBe('seats-out-of-range');
  });

  it('refuses a winning score that is not on the list', () => {
    expect(refuseGameSetup({ ...validSetup, winningScore: 250 })).toBe('unknown-winning-score');
  });

  it('refuses a timer that is not on the list', () => {
    expect(refuseGameSetup({ ...validSetup, roundTimerSeconds: 45 })).toBe('unknown-timer');
  });
});
