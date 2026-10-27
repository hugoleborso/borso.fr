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
      '#c4583a',
      '#3d8a8a',
      '#c4912b',
      '#8a4870',
      '#6e8a48',
    ]);
  });
});
