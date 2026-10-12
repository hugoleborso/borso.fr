import { describe, expect, it } from 'vitest';
import { buildReviewPath, isHistoryFile, readReview, selectHistoryIndex } from './history.core';

const REVIEW = '# Revue hebdo 2026-S41 (5 – 11 octobre 2026)\n\n## Semaine écoulée\n\nCalme.\n';

describe('selectHistoryIndex', () => {
  it('lists the days that carry a brief and the weekly reviews, newest first', () => {
    const files = new Map([
      ['journal/2026-10-06.md', '# 2026-10-06\n\n## Brief envoyé\n\nMardi\n\n---\n\nSuite\n'],
      ['journal/2026-10-08.md', '# 2026-10-08\n\n## Brief envoyé\n\nJeudi\n'],
      ['journal/2026-10-07.md', '# 2026-10-07\n\n## Scan\n\nrien\n'],
      ['journal/2026-S40-hebdo.md', '## Sans titre\n'],
      ['journal/2026-S41-hebdo.md', REVIEW],
      ['journal/notes.md', '## Brief envoyé\n\nx\n'],
    ]);
    expect(selectHistoryIndex(files)).toStrictEqual({
      briefs: [{ date: '2026-10-08' }, { date: '2026-10-06' }],
      reviews: [
        { week: '2026-S41', title: 'Revue hebdo 2026-S41 (5 – 11 octobre 2026)' },
        { week: '2026-S40', title: '2026-S40' },
      ],
    });
  });
});

describe('readReview', () => {
  it('keeps the whole file and reads its title', () => {
    expect(readReview('2026-S41', REVIEW)).toStrictEqual({
      week: '2026-S41',
      title: 'Revue hebdo 2026-S41 (5 – 11 octobre 2026)',
      markdown: REVIEW,
    });
  });
});

describe('isHistoryFile', () => {
  it('accepts the daily journals and the weekly reviews only', () => {
    expect(isHistoryFile('journal/2026-10-08.md')).toBe(true);
    expect(isHistoryFile('journal/2026-S41-hebdo.md')).toBe(true);
    expect(isHistoryFile('journal/2026-10-08.md.bak')).toBe(false);
    expect(isHistoryFile('journal/x2026-10-08.md')).toBe(false);
    expect(isHistoryFile('journal/2026-S41-hebdo.txt')).toBe(false);
    expect(isHistoryFile('journal/a2026-S41-hebdo.md')).toBe(false);
  });
});

describe('buildReviewPath', () => {
  it('names the file of a week', () => {
    expect(buildReviewPath('2026-S41')).toBe('journal/2026-S41-hebdo.md');
  });
});
