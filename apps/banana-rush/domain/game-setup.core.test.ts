import { describe, expect, it } from 'vitest';
import { ROUND_TIMER_CHOICES_SECONDS, WINNING_SCORE_CHOICES } from './game-setup.core';

// @FollowsBlueprint test-pure-unit
describe('the game setup choices', () => {
  it('offers every round length down to five seconds', () => {
    expect(ROUND_TIMER_CHOICES_SECONDS).toEqual([5, 10, 15, 30, 60]);
  });

  it('offers a short, a standard and a long game', () => {
    expect(WINNING_SCORE_CHOICES).toEqual([100, 200, 500]);
  });
});
