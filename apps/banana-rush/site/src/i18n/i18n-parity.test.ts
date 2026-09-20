import { describe, expect, it } from 'vitest';
import en from './en.json';
import fr from './fr.json';

function listKeys(value: unknown, prefix = ''): readonly string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    listKeys(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

// @FollowsBlueprint test-i18n-parity
describe('the two catalogues', () => {
  it('carry exactly the same keys', () => {
    expect(listKeys(fr).toSorted()).toEqual(listKeys(en).toSorted());
  });

  it('carry a French sentence for every error the API can answer', () => {
    const codes = [
      'game-not-found',
      'game-full',
      'already-started',
      'avatar-taken',
      'not-in-lobby',
      'not-enough-players',
      'not-host',
      'not-a-player',
      'not-playing',
      'already-bid',
      'round-still-open',
      'unexpected-failure',
    ];
    for (const code of codes) {
      expect(Object.keys(fr.errors)).toContain(code);
    }
  });
});
