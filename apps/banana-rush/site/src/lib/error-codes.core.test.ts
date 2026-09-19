import { describe, expect, it } from 'vitest';
import { GAME_ERROR_CODES } from './error-codes.core';

// @FollowsBlueprint test-exhaustive-domain
describe('GAME_ERROR_CODES', () => {
  it('names every refusal the interface has a sentence for', () => {
    expect(GAME_ERROR_CODES).toContain('game-not-found');
    expect(GAME_ERROR_CODES).toContain('unexpected-failure');
  });

  it('names each code once', () => {
    expect(new Set(GAME_ERROR_CODES).size).toBe(GAME_ERROR_CODES.length);
  });
});
