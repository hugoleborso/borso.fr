import { describe, expect, it } from 'vitest';
import { listMemberPaletteHexes, MEMBER_PALETTE } from './member-palette.core';

// @FollowsBlueprint test-pure-unit
describe('MEMBER_PALETTE', () => {
  it('names the five hues in order', () => {
    expect(MEMBER_PALETTE.map((slot) => slot.name)).toEqual([
      'coral',
      'teal',
      'mustard',
      'plum',
      'sage',
    ]);
  });

  it('lists the five hex values in the same order', () => {
    expect(listMemberPaletteHexes()).toEqual([
      '#e87b62',
      '#3a9b9b',
      '#d6a93c',
      '#8a4f7a',
      '#7a9b6f',
    ]);
  });
});
