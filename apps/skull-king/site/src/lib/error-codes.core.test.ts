import { describe, expect, it } from 'vitest';
import { GAME_ERROR_CODES } from '@domain/game-error.core';
import { DISPLAYED_ERROR_CODES } from './error-codes.core';

// @FollowsBlueprint test-exhaustive-domain
describe('DISPLAYED_ERROR_CODES', () => {
  it('names every refusal the API can answer, plus the one for an unreadable answer', () => {
    expect(DISPLAYED_ERROR_CODES).toEqual([...GAME_ERROR_CODES, 'unexpected-failure']);
  });

  it('names each code once', () => {
    expect(new Set(DISPLAYED_ERROR_CODES).size).toBe(DISPLAYED_ERROR_CODES.length);
  });
});
