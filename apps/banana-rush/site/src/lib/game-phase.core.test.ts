import { describe, expect, it } from 'vitest';
import { isJoinable, isRoundOver, isLastRoundShowing } from './game-phase.core';

// @FollowsBlueprint test-pure-unit
describe('isRoundOver', () => {
  it('is true when the clock has run out on a running game', () => {
    expect(isRoundOver(0, 'playing')).toBe(true);
  });

  it('is false while seconds remain', () => {
    expect(isRoundOver(5, 'playing')).toBe(false);
  });

  it('is false for a game played without a timer', () => {
    expect(isRoundOver(null, 'playing')).toBe(false);
  });

  it('is false while the game waits in the lobby', () => {
    expect(isRoundOver(0, 'lobby')).toBe(false);
  });

  it('is false once the game is over', () => {
    expect(isRoundOver(0, 'finished')).toBe(false);
  });

  it('is false before the game has been read at all', () => {
    expect(isRoundOver(0, null)).toBe(false);
  });
});

describe('isJoinable', () => {
  it('is true for a newcomer at a lobby', () => {
    expect(isJoinable(false, 'lobby')).toBe(true);
  });

  it('is false for somebody already seated', () => {
    expect(isJoinable(true, 'lobby')).toBe(false);
  });

  it('is false once the game has started', () => {
    expect(isJoinable(false, 'playing')).toBe(false);
  });

  it('is false once the game is over', () => {
    expect(isJoinable(false, 'finished')).toBe(false);
  });
});

describe('isLastRoundShowing', () => {
  it('shows nothing before the first round has resolved', () => {
    expect(isLastRoundShowing(false, false)).toBe(false);
    expect(isLastRoundShowing(false, true)).toBe(false);
  });

  it('shows the reveal while the bid for the next round is still to come', () => {
    expect(isLastRoundShowing(true, false)).toBe(true);
  });

  it('gives the band back to the roster once the bid is in', () => {
    expect(isLastRoundShowing(true, true)).toBe(false);
  });
});
