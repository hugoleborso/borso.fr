import { describe, expect, it } from 'vitest';
import { selectUpcomingConcerts } from './upcoming-concerts.core';

const NOW = Date.parse('2026-05-01T12:00:00.000Z');

const PAST_CONCERT = { id: 'past-concert', kind: 'concert', date: '2026-04-01T20:00:00.000Z' };
const FUTURE_CONCERT = { id: 'future-concert', kind: 'concert', date: '2026-06-01T20:00:00.000Z' };
const FUTURE_PRACTICE = {
  id: 'future-practice',
  kind: 'practice',
  date: '2026-06-02T18:00:00.000Z',
};
const SESSIONS = [PAST_CONCERT, FUTURE_CONCERT, FUTURE_PRACTICE];

describe('selectUpcomingConcerts', () => {
  it('keeps the concerts that have not happened yet', () => {
    expect(selectUpcomingConcerts(SESSIONS, NOW).map((session) => session.id)).toStrictEqual([
      'future-concert',
    ]);
  });

  it('drops practices whatever their date', () => {
    expect(selectUpcomingConcerts([FUTURE_PRACTICE], NOW)).toStrictEqual([]);
  });

  it('treats a concert starting exactly now as already started', () => {
    const startingNow = [{ id: 'now', kind: 'concert', date: new Date(NOW).toISOString() }];

    expect(selectUpcomingConcerts(startingNow, NOW)).toStrictEqual([]);
    expect(selectUpcomingConcerts(startingNow, NOW - 1)).toStrictEqual(startingNow);
  });

  it('leaves an empty list empty', () => {
    expect(selectUpcomingConcerts([], NOW)).toStrictEqual([]);
  });
});
