import { SONG_CHARTS_MAX } from '@domain/input-limits.core';
import { describe, expect, it } from 'vitest';
import {
  BLANK_CHART_CARD,
  canAddChartCard,
  canMoveChartCard,
  chartsFromCards,
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
  const first = { ...CHORDPRO_CARD, cardId: 'first', label: 'first' };
  const second = { ...CHORDPRO_CARD, cardId: 'second', label: 'second' };
  const third = { ...CHORDPRO_CARD, cardId: 'third', label: 'third' };

  it('moves a card up or down by one and refuses to move past either end', () => {
    expect(moveChartCard([first, second, third], 'second', -1)).toEqual([second, first, third]);
    expect(moveChartCard([first, second, third], 'second', 1)).toEqual([first, third, second]);
    expect(moveChartCard([first, second], 'first', -1)).toEqual([first, second]);
    expect(moveChartCard([first, second], 'second', 1)).toEqual([first, second]);
    expect(canMoveChartCard(0, 2, -1)).toBe(false);
    expect(canMoveChartCard(0, 2, 1)).toBe(true);
    expect(canMoveChartCard(1, 2, 1)).toBe(false);
    expect(canMoveChartCard(1, 2, -1)).toBe(true);
  });

  it('leaves the list as it is when the moved card is gone', () => {
    expect(moveChartCard([first, second], 'removed', 1)).toEqual([first, second]);
  });

  it('adds a blank card under the id it is given until the song holds six', () => {
    const full = Array.from({ length: SONG_CHARTS_MAX }, () => first);
    expect(canAddChartCard(SONG_CHARTS_MAX - 1)).toBe(true);
    expect(canAddChartCard(SONG_CHARTS_MAX)).toBe(false);
    expect(withChartCardAdded([first], 'added')).toEqual([
      first,
      { ...BLANK_CHART_CARD, cardId: 'added' },
    ]);
    expect(withChartCardAdded(full, 'added')).toBe(full);
  });

  it('removes one card and changes one card, found by its id', () => {
    expect(withoutChartCard([first, second, third], 'second')).toEqual([first, third]);
    expect(withChartCardChanged([first, second], 'second', { label: 'solo' })).toEqual([
      first,
      { ...second, label: 'solo' },
    ]);
  });

  it('changes no card once the card is gone', () => {
    expect(withChartCardChanged([first], 'removed', { label: 'solo' })).toEqual([first]);
  });
});

describe('chartsFromCards', () => {
  it('drops a card switched away from its file whose new file was removed', () => {
    expect(
      chartsFromCards([
        { ...BLANK_CHART_CARD, kind: 'image', pdfS3Key: 'a.pdf', imageS3Key: '' },
        { ...BLANK_CHART_CARD, kind: 'none', imageS3Key: 'a.png' },
      ]),
    ).toEqual([]);
  });
});
