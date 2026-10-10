import { describe, expect, it } from 'vitest';
import { GAME_ERROR_CODES } from './game-error.core';

// @FollowsBlueprint test-exhaustive-domain
describe('GAME_ERROR_CODES', () => {
  it('names every refusal of the lifecycle the screens explain', () => {
    expect(GAME_ERROR_CODES).toEqual(
      expect.arrayContaining(['not-in-lobby', 'not-enough-players', 'game-full']),
    );
  });

  it('names each code once', () => {
    expect(new Set(GAME_ERROR_CODES).size).toBe(GAME_ERROR_CODES.length);
  });
});
