import { describe, expect, it } from 'vitest';
import catalogue from '../i18n/fr.json';
import { selectClosenessNameKey } from './closeness-name.core';

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

// @FollowsBlueprint test-pure-unit
describe('selectClosenessNameKey', () => {
  it.each(LEVELS)('names the level %i of a person in the set of persons', (level) => {
    expect(selectClosenessNameKey(level, 'personne')).toBe(`closeness.name.person.${level}`);
    expect(selectClosenessNameKey(String(level), 'personne')).toBe(
      `closeness.name.person.${level}`,
    );
  });

  it.each(LEVELS)('names the level %i of any other kind in the other set', (level) => {
    expect(selectClosenessNameKey(level, 'organisation')).toBe(`closeness.name.other.${level}`);
    expect(selectClosenessNameKey(String(level), 'domaine')).toBe(`closeness.name.other.${level}`);
    expect(selectClosenessNameKey(level, 'inconnu')).toBe(`closeness.name.other.${level}`);
    expect(selectClosenessNameKey(level, '')).toBe(`closeness.name.other.${level}`);
  });

  it.each([null, 6, -1, 2.5, Number.NaN, '', 'proche', 'constructor'])(
    'gives no name to %s, which is outside the scale, whatever the kind',
    (level) => {
      expect(selectClosenessNameKey(level, 'personne')).toBeNull();
      expect(selectClosenessNameKey(level, 'domaine')).toBeNull();
    },
  );

  it.each([
    [0, 'Contacts', 'Périphérie'],
    [1, 'Bonnes relations', 'Contexte'],
    [2, 'Copains', 'Secondaire'],
    [3, 'Amis', 'Suivi'],
    [4, 'Proches', 'Important'],
    [5, 'Intimes', 'Au cœur'],
  ] as const)(
    'reads level %i as « %s » for a person and « %s » for any other kind in the catalogue',
    (level, personName, otherName) => {
      expect(catalogue[`closeness.name.person.${level}`]).toBe(personName);
      expect(catalogue[`closeness.name.other.${level}`]).toBe(otherName);
    },
  );
});
