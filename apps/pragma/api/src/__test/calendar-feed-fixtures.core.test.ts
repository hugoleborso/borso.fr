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

  it('name only the fixtures that exist', () => {
    expect(isFixtureFeedName('hugo')).toBe(true);
    expect(isFixtureFeedName('lea')).toBe(false);
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
    expect(countSavedFeeds([{ kind: 'saved' }, { kind: 'invalid-address' }])).toBe(1);
  });
});
