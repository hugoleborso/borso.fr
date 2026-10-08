import { describe, expect, it } from 'vitest';
import {
  buildBriefHref,
  buildReviewHref,
  readHistoryFilter,
  removeTitleLine,
  selectHistoryEntryDisplay,
  selectHistoryRows,
  selectHistoryFilterLabelKey,
} from './history-board.core';

describe('readHistoryFilter', () => {
  it('reads a known filter and falls back on the briefs', () => {
    expect(readHistoryFilter('reviews')).toBe('reviews');
    expect(readHistoryFilter('briefs')).toBe('briefs');
    expect(readHistoryFilter('autre')).toBe('briefs');
    expect(readHistoryFilter(null)).toBe('briefs');
  });
});

describe('selectHistoryFilterLabelKey', () => {
  it('names each filter', () => {
    expect(selectHistoryFilterLabelKey('briefs')).toBe('history.filter.briefs');
    expect(selectHistoryFilterLabelKey('reviews')).toBe('history.filter.reviews');
  });
});

describe('the history addresses', () => {
  it('opens a brief by its day and a review by its week', () => {
    expect(buildBriefHref('2026-10-08')).toBe('/history/briefs/2026-10-08');
    expect(buildReviewHref('2026-S41')).toBe('/history/reviews/2026-S41');
  });
});

describe('removeTitleLine', () => {
  it('drops the first title line, which the screen shows above the text', () => {
    expect(removeTitleLine('# Revue hebdo\n\n## Semaine\n\n# Autre')).toBe(
      '\n## Semaine\n\n# Autre',
    );
  });

  it('keeps a text without a title as it is', () => {
    expect(removeTitleLine('## Semaine\nCalme')).toBe('## Semaine\nCalme');
  });
});

describe('selectHistoryRows', () => {
  const index = {
    briefs: [{ date: '2026-10-08' }],
    reviews: [{ week: '2026-S41', title: 'Revue hebdo 2026-S41' }],
  };

  it('lists the briefs by their day', () => {
    expect(selectHistoryRows(index, 'briefs', 'fr-FR')).toStrictEqual([
      {
        key: '2026-10-08',
        href: '/history/briefs/2026-10-08',
        icon: 'today',
        title: 'jeudi 8 octobre',
        caption: '2026-10-08',
        isBrief: true,
        subject: { kind: 'journal', date: '2026-10-08' },
      },
    ]);
  });

  it('lists the reviews by their title', () => {
    expect(selectHistoryRows(index, 'reviews', 'fr-FR')).toStrictEqual([
      {
        key: '2026-S41',
        href: '/history/reviews/2026-S41',
        icon: 'book',
        title: 'Revue hebdo 2026-S41',
        isBrief: false,
        subject: { kind: 'review', week: '2026-S41' },
      },
    ]);
  });
});

describe('selectHistoryEntryDisplay', () => {
  it('waits while the text is loading, and shows it once there', () => {
    expect(selectHistoryEntryDisplay(undefined, null)).toStrictEqual({
      isMissing: false,
      isWaiting: true,
    });
    expect(selectHistoryEntryDisplay('# Brief', null)).toStrictEqual({
      isMissing: false,
      isWaiting: false,
    });
  });

  it('says the entry is missing only on a not found answer', () => {
    expect(selectHistoryEntryDisplay(undefined, { status: 404 })).toStrictEqual({
      isMissing: true,
      isWaiting: false,
    });
    expect(selectHistoryEntryDisplay(undefined, { status: 502 })).toStrictEqual({
      isMissing: false,
      isWaiting: true,
    });
    expect(selectHistoryEntryDisplay(undefined, new Error('x'))).toStrictEqual({
      isMissing: false,
      isWaiting: true,
    });
    expect(selectHistoryEntryDisplay(undefined, 'x')).toStrictEqual({
      isMissing: false,
      isWaiting: true,
    });
  });
});
