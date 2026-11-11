import { describe, expect, it } from 'vitest';
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
});
