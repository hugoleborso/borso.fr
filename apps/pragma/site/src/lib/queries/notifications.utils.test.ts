import { describe, expect, it } from 'vitest';
import { setCategoryToggle } from './notifications.utils';

const TOGGLES = [
  { category: 'takes', enabled: true },
  { category: 'sessions', enabled: false },
];

describe('setCategoryToggle', () => {
  it('flips the one category it names and keeps the order', () => {
    expect(setCategoryToggle(TOGGLES, 'takes', false)).toEqual([
      { category: 'takes', enabled: false },
      { category: 'sessions', enabled: false },
    ]);
  });

  it('leaves the list as it was for a category it does not hold', () => {
    expect(setCategoryToggle(TOGGLES, 'setlists', false)).toEqual(TOGGLES);
  });
});
