import { describe, expect, it } from 'vitest';
import catalogue from '../i18n/fr.json';
import { selectClosenessNameKey } from './closeness-name.core';

// @FollowsBlueprint test-pure-unit
describe('selectClosenessNameKey', () => {
  it.each([
    [0, 'closeness.name.0'],
    [1, 'closeness.name.1'],
    [2, 'closeness.name.2'],
    [3, 'closeness.name.3'],
    [4, 'closeness.name.4'],
    [5, 'closeness.name.5'],
    ['4', 'closeness.name.4'],
  ])('names the level %s', (level, nameKey) => {
    expect(selectClosenessNameKey(level)).toBe(nameKey);
  });

  it.each([6, -1, 2.5, Number.NaN, '', 'proche', 'constructor'])(
    'gives no name to %s, which is outside the scale',
    (level) => {
      expect(selectClosenessNameKey(level)).toBeNull();
    },
  );

  it.each([
    [0, 'Contacts'],
    [1, 'Bonnes relations'],
    [2, 'Copains'],
    [3, 'Amis'],
    [4, 'Proches'],
    [5, 'Intimes'],
  ] as const)('reads level %i as « %s » in the catalogue', (level, name) => {
    expect(catalogue[`closeness.name.${level}`]).toBe(name);
  });
});
