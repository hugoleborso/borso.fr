import { PIRATE_PARTS } from '@domain/pirate-avatar.core';
import { PLAYER_COLORS } from '@domain/player-mark.core';
import { BONUS_KINDS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { DISPLAYED_ERROR_CODES } from './error-codes.core';
import {
  BONUS_KEYS,
  COLOR_KEYS,
  PIRATE_PART_KEYS,
  selectCreateErrorKey,
  selectErrorKey,
} from './translation-keys.core';

function readKey(catalogue: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, segment) => {
    if (typeof node !== 'object' || node === null) return undefined;
    return Object.entries(node).find(([name]) => name === segment)?.[1];
  }, catalogue);
}

// @FollowsBlueprint test-exhaustive-domain
describe('the lookup keys', () => {
  it('name a sentence in the catalogue for every pirate part, colour and bonus card', () => {
    const keys = [
      ...PIRATE_PARTS.map((part) => PIRATE_PART_KEYS[part]),
      ...PLAYER_COLORS.map((color) => COLOR_KEYS[color]),
      ...BONUS_KINDS.map((kind) => BONUS_KEYS[kind]),
    ];
    for (const key of keys) {
      expect(typeof readKey(en, key)).toBe('string');
    }
  });
});

describe('selectErrorKey', () => {
  it('names a sentence in the catalogue for every code the API answers', () => {
    for (const code of DISPLAYED_ERROR_CODES) {
      expect(typeof readKey(en, selectErrorKey(code))).toBe('string');
    }
  });

  it('falls back to the unexpected failure for a code it does not know', () => {
    expect(selectErrorKey('a-later-code')).toBe('errors.unexpected-failure');
  });

  it('keeps the key of a code it knows', () => {
    expect(selectErrorKey('game-not-found')).toBe('errors.game-not-found');
  });
});

describe('selectCreateErrorKey', () => {
  it('says the game was not created, never that a number is out of range, when the table is refused', () => {
    const key = selectCreateErrorKey('value-out-of-range');
    expect(key).toBe('errors.game-not-created');
    expect(typeof readKey(en, key)).toBe('string');
  });

  it('keeps the sentence of every other code', () => {
    expect(selectCreateErrorKey('unexpected-failure')).toBe('errors.unexpected-failure');
    expect(selectCreateErrorKey('session-required')).toBe('errors.session-required');
  });
});
