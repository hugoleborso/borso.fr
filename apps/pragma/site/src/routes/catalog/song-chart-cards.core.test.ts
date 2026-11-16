import { SONG_CHARTS_MAX } from '@domain/input-limits.core';
import { describe, expect, it } from 'vitest';
import {
  BLANK_CHART_CARD,
  canAddChartCard,
  canMoveChartCard,
  moveChartCard,
  type SongChartCardDraft,
  withChartCardAdded,
  withChartCardChanged,
  withoutChartCard,
} from './song-chart-cards.core';

const CHORDPRO_CARD: SongChartCardDraft = {
  ...BLANK_CHART_CARD,
  kind: 'chordpro',
  chordproText: '[C]',
};

// @FollowsBlueprint test-pure-unit
describe('the chart card list', () => {
  const first = { ...CHORDPRO_CARD, label: 'first' };
  const second = { ...CHORDPRO_CARD, label: 'second' };
  const third = { ...CHORDPRO_CARD, label: 'third' };

  it('moves a card up or down by one and refuses to move past either end', () => {
    expect(moveChartCard([first, second, third], 1, -1)).toEqual([second, first, third]);
    expect(moveChartCard([first, second, third], 1, 1)).toEqual([first, third, second]);
    expect(moveChartCard([first, second], 0, -1)).toEqual([first, second]);
    expect(moveChartCard([first, second], 1, 1)).toEqual([first, second]);
    expect(canMoveChartCard(0, 2, -1)).toBe(false);
    expect(canMoveChartCard(0, 2, 1)).toBe(true);
    expect(canMoveChartCard(1, 2, 1)).toBe(false);
  });

  it('adds a blank card until the song holds six', () => {
    const full = Array.from({ length: SONG_CHARTS_MAX }, () => first);
    expect(canAddChartCard(SONG_CHARTS_MAX - 1)).toBe(true);
    expect(canAddChartCard(SONG_CHARTS_MAX)).toBe(false);
    expect(withChartCardAdded([first])).toEqual([first, BLANK_CHART_CARD]);
    expect(withChartCardAdded(full)).toBe(full);
  });

  it('removes one card and changes one card', () => {
    expect(withoutChartCard([first, second, third], 1)).toEqual([first, third]);
    expect(withChartCardChanged([first, second], 1, { label: 'solo' })).toEqual([
      first,
      { ...second, label: 'solo' },
    ]);
  });
});
