import { MONKEY_AVATARS } from '@domain/monkey.core';
import { describe, expect, it } from 'vitest';
import fr from '../i18n/fr.json';
import { GAME_ERROR_CODES } from './error-codes.core';
import {
  ERROR_KEYS,
  LANGUAGE_KEYS,
  RULE_KEYS,
  selectErrorKey,
  selectMonkeyKey,
} from './translation-keys.core';

function isKeyInCatalogue(dottedKey: string): boolean {
  let cursor: unknown = fr;
  for (const step of dottedKey.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) return false;
    cursor = Object.entries(cursor).find(([key]) => key === step)?.[1];
  }
  return typeof cursor === 'string';
}

// @FollowsBlueprint test-exhaustive-domain
describe('selectErrorKey', () => {
  it('finds the key for a code the API can answer', () => {
    expect(selectErrorKey('game-full')).toBe('errors.game-full');
  });

  it('falls back for a code no version of this interface knows', () => {
    expect(selectErrorKey('banana-shortage')).toBe('errors.unexpected-failure');
  });

  it('answers a key the catalogue actually holds, for every known code', () => {
    for (const code of GAME_ERROR_CODES) {
      expect(isKeyInCatalogue(selectErrorKey(code))).toBe(true);
    }
  });
});

describe('selectMonkeyKey', () => {
  it('finds the key for a monkey the game ships', () => {
    expect(selectMonkeyKey('lemur')).toBe('monkeys.lemur');
  });

  it('falls back for a monkey a later version might add', () => {
    expect(selectMonkeyKey('orangutan')).toBe('monkeys.chimp');
  });

  it('answers a key the catalogue actually holds, for every monkey', () => {
    for (const avatar of MONKEY_AVATARS) {
      expect(isKeyInCatalogue(selectMonkeyKey(avatar))).toBe(true);
    }
  });
});

describe('the keys written out by hand', () => {
  it('all resolve in the catalogue', () => {
    for (const key of [
      ...RULE_KEYS,
      ...Object.values(LANGUAGE_KEYS),
      ...Object.values(ERROR_KEYS),
    ]) {
      expect(isKeyInCatalogue(key)).toBe(true);
    }
  });
});
