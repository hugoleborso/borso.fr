import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS, PLAYER_ICONS, suggestMark } from './player-mark.core';

// @FollowsBlueprint test-pure-unit
describe('suggestMark', () => {
  it('gives each of the first seats a different icon and colour', () => {
    expect(suggestMark(0)).toEqual({ icon: 'skull', color: 'gold' });
    expect(suggestMark(1)).toEqual({ icon: 'anchor', color: 'sky' });
  });

  it('wraps around once every icon and colour has been suggested', () => {
    expect(suggestMark(PLAYER_ICONS.length).icon).toBe('skull');
    expect(suggestMark(PLAYER_COLORS.length).color).toBe('gold');
  });

  it('falls back to the first mark for a seat outside the table', () => {
    expect(suggestMark(-1)).toEqual({ icon: 'skull', color: 'gold' });
  });
});
