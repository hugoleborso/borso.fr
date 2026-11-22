import { describe, expect, it } from 'vitest';
import { GAME_ERROR_CODES } from './game-error.core';

// @FollowsBlueprint test-exhaustive-domain
describe('GAME_ERROR_CODES', () => {
  it('names every refusal the screens explain', () => {
    expect(GAME_ERROR_CODES).toEqual(
      expect.arrayContaining([
        'game-not-found',
        'round-not-played',
        'bids-missing',
        'tricks-unbalanced',
        'seat-taken',
        'session-required',
        'passkey-not-verified',
      ]),
    );
  });

  it('names each code once', () => {
    expect(new Set(GAME_ERROR_CODES).size).toBe(GAME_ERROR_CODES.length);
  });
});
