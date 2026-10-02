import { describe, expect, it } from 'vitest';
import { readBusyIntervals } from '../calendar-feeds/ics.core';
import { SEARCH_DAYS, selectFreeSlots } from '../free-slots/free-slots.core';
import {
  answerFixtureFeedRequest,
  buildFixtureFeed,
  countSavedFeeds,
  FIXTURE_FEED_NAMES,
  isFixtureFeedName,
  listFixtureFeedAttachments,
} from './calendar-feed-fixtures.core';

const MILLISECONDS_PER_DAY = 86_400_000;

function freeSlotsOfTheFixtures(now: Date): string[][] {
  const range = { start: now, end: new Date(now.getTime() + SEARCH_DAYS * MILLISECONDS_PER_DAY) };
  const busy = FIXTURE_FEED_NAMES.flatMap((name) => {
    const outcome = readBusyIntervals(buildFixtureFeed(name, now), range);
    if (outcome.kind !== 'ok') throw new Error(`fixture ${name} did not parse`);
    return outcome.intervals;
  });
  return selectFreeSlots(now, busy).map((slot) => [
    slot.start.toISOString(),
    slot.end.toISOString(),
  ]);
}

describe('preview calendar fixtures', () => {
  it('leave exactly one slot, two days ahead, 19:15 to 23:00 Paris, on a weekday', () => {
    expect(freeSlotsOfTheFixtures(new Date('2026-10-13T08:00:00Z'))).toStrictEqual([
      ['2026-10-15T17:15:00.000Z', '2026-10-15T21:00:00.000Z'],
    ]);
  });

  it('leave the same slot when the free day is a Saturday', () => {
    expect(freeSlotsOfTheFixtures(new Date('2026-12-03T20:00:00Z'))).toStrictEqual([
      ['2026-12-05T18:15:00.000Z', '2026-12-05T22:00:00.000Z'],
    ]);
  });

  it.each(FIXTURE_FEED_NAMES)('write the %s feed exactly as recorded', (name) => {
    expect(buildFixtureFeed(name, new Date('2026-10-13T08:00:00Z'))).toMatchSnapshot();
  });

  it('name only the fixtures that exist', () => {
    expect(isFixtureFeedName('hugo')).toBe(true);
    expect(isFixtureFeedName('lea')).toBe(false);
  });
});

describe('edge-case fixtures', () => {
  const now = new Date('2026-10-13T08:00:00Z');
  const range = { start: now, end: new Date(now.getTime() + SEARCH_DAYS * MILLISECONDS_PER_DAY) };

  function busyOf(name: 'declined' | 'midnight' | 'everything'): string[][] {
    const outcome = readBusyIntervals(buildFixtureFeed(name, now), range);
    if (outcome.kind !== 'ok') throw new Error(`fixture ${name} did not parse`);
    return outcome.intervals.map((busy) => [busy.start.toISOString(), busy.end.toISOString()]);
  }

  it('keeps a declined invitation busy, two days ahead from 19:00 to 21:00 Paris', () => {
    expect(busyOf('declined')).toStrictEqual([
      ['2026-10-15T17:00:00.000Z', '2026-10-15T19:00:00.000Z'],
    ]);
    expect(buildFixtureFeed('declined', now)).toContain('PARTSTAT=DECLINED');
  });

  it('crosses midnight, from 22:00 two days ahead to 20:00 the day after', () => {
    expect(busyOf('midnight')).toStrictEqual([
      ['2026-10-15T20:00:00.000Z', '2026-10-16T18:00:00.000Z'],
    ]);
  });

  it('leaves no free slot at all', () => {
    const busy = busyOf('everything').map(([start = '', end = '']) => ({
      start: new Date(start),
      end: new Date(end),
    }));
    expect(selectFreeSlots(now, busy)).toStrictEqual([]);
  });

  it('is over the feed size limit while still a calendar', () => {
    const huge = buildFixtureFeed('huge', now);
    expect(new TextEncoder().encode(huge).byteLength).toBeGreaterThan(5_767_168);
    expect(huge.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });

  it('are served, but never attached by the seed', () => {
    expect(answerFixtureFeedRequest('midnight.ics', now).status).toBe(200);
    expect(isFixtureFeedName('midnight')).toBe(false);
  });
});

describe('answerFixtureFeedRequest', () => {
  const now = new Date('2026-10-13T08:00:00Z');

  it('serves a fixture by its file name, with or without the extension', () => {
    expect(answerFixtureFeedRequest('hugo.ics', now)).toStrictEqual({
      status: 200,
      body: buildFixtureFeed('hugo', now),
      delayMs: 0,
    });
    expect(answerFixtureFeedRequest('marc', now).status).toBe(200);
    expect(answerFixtureFeedRequest('sarah.ics', now).body).toBe(buildFixtureFeed('sarah', now));
  });

  it('answers 410 for the address a provider has reset, at once', () => {
    expect(answerFixtureFeedRequest('gone.ics', now)).toStrictEqual({
      status: 410,
      body: null,
      delayMs: 0,
    });
  });

  it('answers after longer than the feed time limit for the slow address', () => {
    expect(answerFixtureFeedRequest('slow.ics', now).delayMs).toBe(6_000);
  });

  it('answers 404 for any other name', () => {
    expect(answerFixtureFeedRequest('lea.ics', now)).toStrictEqual({
      status: 404,
      body: null,
      delayMs: 0,
    });
  });
});

describe('listFixtureFeedAttachments', () => {
  it('attaches a fixture to each seeded member that has one', () => {
    expect(
      listFixtureFeedAttachments(
        [
          { memberId: 'id-hugo', username: 'hugo' },
          { memberId: 'id-lea', username: 'lea' },
        ],
        'https://pragma-pr-118.preview.borso.fr',
      ),
    ).toStrictEqual([
      {
        memberId: 'id-hugo',
        address: 'https://pragma-pr-118.preview.borso.fr/api/__test/calendar-feeds/hugo.ics',
      },
    ]);
  });
});

describe('countSavedFeeds', () => {
  it('counts only the saved outcomes', () => {
    expect(
      countSavedFeeds([{ kind: 'saved' }, { kind: 'saved' }, { kind: 'invalid-address' }]),
    ).toBe(2);
  });
});
