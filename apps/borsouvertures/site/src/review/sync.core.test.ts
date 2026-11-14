import { mergeReviewEvents, selectReplayInstant } from '@domain/review-event.core';
import { describe, expect, it } from 'vitest';
import {
  advanceCursor,
  isPulledPageDurable,
  isSessionExpiryShown,
  applyPushReceipt,
  decideSyncOutcome,
  isAnotherRoundNeeded,
  hasUnpushedEvents,
  isSessionEnded,
  MAX_ROUNDS_PER_SYNC,
  readPulledDeckLinePage,
  readPulledPage,
  readPushReceipts,
  selectSyncStatus,
  selectUnpushedEvents,
} from './sync.core';
import { buildEventId, buildReviewEvent, LAPTOP } from './review.test-utils';

const CARD = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';
const RECEIVED_AT = '2026-01-10T08:00:09.000Z';

// @FollowsBlueprint test-pure-unit
describe('decideSyncOutcome', () => {
  it.each([200, 204, 299])('answers synced for %i', (status) => {
    expect(decideSyncOutcome(status)).toBe('synced');
  });

  it('answers signed-out for a 401, so the app shows the sign-in link again', () => {
    expect(decideSyncOutcome(401)).toBe('signed-out');
  });

  it.each([400, 403, 413, 499])('answers rejected for the client error %i', (status) => {
    expect(decideSyncOutcome(status)).toBe('rejected');
  });

  it.each([199, 300, 500, 503])(
    'answers offline for %i, which says nothing about the batch',
    (status) => {
      expect(decideSyncOutcome(status)).toBe('offline');
    },
  );
});

describe('selectUnpushedEvents', () => {
  const pushed = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z', 'recalled', {
    receivedAt: RECEIVED_AT,
  });
  const first = buildReviewEvent(2, CARD, '2026-01-10T08:01:00.000Z');
  const second = buildReviewEvent(3, CARD, '2026-01-10T08:02:00.000Z');

  it('keeps the events the API has not received, in log order', () => {
    expect(selectUnpushedEvents([pushed, first, second])).toEqual([first, second]);
  });

  it('cuts a batch at the limit', () => {
    expect(selectUnpushedEvents([first, second], 1)).toEqual([first]);
  });

  it('cuts at five hundred by default', () => {
    const many = Array.from({ length: 501 }, (_unused, index) =>
      buildReviewEvent(index + 10, CARD, '2026-01-10T08:00:00.000Z'),
    );
    expect(selectUnpushedEvents(many)).toHaveLength(500);
  });
});

describe('applyPushReceipt', () => {
  const first = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z');
  const second = buildReviewEvent(2, CARD, '2026-01-10T08:01:00.000Z');

  it('stamps each pushed event with the receivedAt the API stored', () => {
    expect(
      applyPushReceipt([first, second], [{ id: buildEventId(2), receivedAt: RECEIVED_AT }]),
    ).toEqual([{ ...second, receivedAt: RECEIVED_AT }]);
  });

  it('replays an event of a device whose clock runs ahead on the earlier server time', () => {
    const ahead = buildReviewEvent(4, CARD, '2026-01-10T09:00:00.000Z', 'recalled', {
      deviceId: LAPTOP,
    });
    const [stamped] = applyPushReceipt([ahead], [{ id: buildEventId(4), receivedAt: RECEIVED_AT }]);
    expect(stamped).toBeDefined();
    expect(selectReplayInstant(stamped ?? ahead, new Date('2026-01-11T00:00:00.000Z'))).toEqual(
      new Date(RECEIVED_AT),
    );
    expect(stamped?.reviewedAt).toBe('2026-01-10T09:00:00.000Z');
  });

  it('turns local events and an empty server into one log once pushed', () => {
    const stamped = applyPushReceipt(
      [first, second],
      [
        { id: buildEventId(1), receivedAt: RECEIVED_AT },
        { id: buildEventId(2), receivedAt: RECEIVED_AT },
      ],
    );
    expect(mergeReviewEvents([first, second], stamped)).toEqual(stamped);
  });
});

describe('advanceCursor', () => {
  it('moves to the cursor the API answered', () => {
    expect(advanceCursor('resume~a~b', 'page~c~d')).toBe('page~c~d');
  });

  it('keeps the cursor it had when the API answered none', () => {
    expect(advanceCursor('resume~a~b', null)).toBe('resume~a~b');
    expect(advanceCursor(null, null)).toBeNull();
  });
});

describe('isPulledPageDurable', () => {
  it('keeps the cursor on disk once the page is stored and the store still writes', () => {
    expect(isPulledPageDurable('stored', true)).toBe(true);
  });

  it('keeps the cursor for the open tab only when the page stayed in memory', () => {
    expect(isPulledPageDurable('in-memory-only', true)).toBe(false);
  });

  it('keeps the cursor for the open tab only once the store has stopped writing, even for an empty page', () => {
    expect(isPulledPageDurable('stored', false)).toBe(false);
  });
});

describe('isAnotherRoundNeeded', () => {
  const settled = { roundsRun: 1, unpushedLeft: 0, hasMore: false, isRerunRequested: false };

  it('stops once nothing is left to push or pull and nothing new was asked', () => {
    expect(isAnotherRoundNeeded(settled)).toBe(false);
  });

  it('runs again for events still queued, a page still waiting, or a review made meanwhile', () => {
    expect(isAnotherRoundNeeded({ ...settled, unpushedLeft: 1 })).toBe(true);
    expect(isAnotherRoundNeeded({ ...settled, hasMore: true })).toBe(true);
    expect(isAnotherRoundNeeded({ ...settled, isRerunRequested: true })).toBe(true);
  });

  it('stops after twenty rounds, so a server that never stamps a batch cannot spin the device', () => {
    expect(MAX_ROUNDS_PER_SYNC).toBe(20);
    expect(isAnotherRoundNeeded({ ...settled, roundsRun: 19, unpushedLeft: 1 })).toBe(true);
    expect(isAnotherRoundNeeded({ ...settled, roundsRun: 20, unpushedLeft: 1 })).toBe(false);
  });
});

describe('isSessionExpiryShown', () => {
  it('shows the expiry once a 401 signed the device out', () => {
    expect(isSessionExpiryShown('expired', { signedIn: false })).toBe(true);
  });

  it('hides it once the operator signed in again, even before a sync completes', () => {
    expect(isSessionExpiryShown('expired', { signedIn: true })).toBe(false);
  });

  it('hides it when the API has not answered the session yet', () => {
    expect(isSessionExpiryShown('expired', undefined)).toBe(false);
  });

  it('hides it for a device that was never signed in or signed out by hand', () => {
    expect(isSessionExpiryShown('idle', { signedIn: false })).toBe(false);
    expect(isSessionExpiryShown('synced', { signedIn: false })).toBe(false);
  });
});

describe('selectSyncStatus', () => {
  it('shows synced after a full exchange and sync paused after a refusal', () => {
    expect(selectSyncStatus('synced', 'paused')).toBe('synced');
    expect(selectSyncStatus('rejected', 'synced')).toBe('paused');
  });

  it('marks the session expired when the API answered 401', () => {
    expect(selectSyncStatus('signed-out', 'paused')).toBe('expired');
  });

  it('keeps the status it had when offline, since offline is not an error', () => {
    expect(selectSyncStatus('offline', 'paused')).toBe('paused');
    expect(selectSyncStatus('offline', 'synced')).toBe('synced');
  });
});

describe('hasUnpushedEvents', () => {
  it('says whether the log holds an event the API has not received', () => {
    const pushed = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z', 'recalled', {
      receivedAt: RECEIVED_AT,
    });
    expect(hasUnpushedEvents([pushed])).toBe(false);
    expect(hasUnpushedEvents([pushed, buildReviewEvent(2, CARD, '2026-01-10T08:01:00.000Z')])).toBe(
      true,
    );
  });
});

describe('isSessionEnded', () => {
  it('ends the session on signed-out only', () => {
    expect(isSessionEnded('signed-out')).toBe(true);
    expect(isSessionEnded('rejected')).toBe(false);
    expect(isSessionEnded('offline')).toBe(false);
  });
});

describe('readPushReceipts', () => {
  it('reads the receipts of the push answer', () => {
    expect(readPushReceipts({ accepted: [{ id: 'a', receivedAt: RECEIVED_AT }] })).toEqual([
      { id: 'a', receivedAt: RECEIVED_AT },
    ]);
  });

  it('drops a receipt it cannot read and keeps the others', () => {
    expect(
      readPushReceipts({
        accepted: [
          { id: 'a' },
          { receivedAt: RECEIVED_AT },
          'b',
          { id: 'c', receivedAt: RECEIVED_AT },
        ],
      }),
    ).toEqual([{ id: 'c', receivedAt: RECEIVED_AT }]);
  });

  it('answers null for a body that is not a push answer', () => {
    expect(readPushReceipts({ accepted: 'all' })).toBeNull();
    expect(readPushReceipts(null)).toBeNull();
  });
});

describe('readPulledPage', () => {
  const received = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z', 'recalled', {
    receivedAt: RECEIVED_AT,
  });

  it('reads the events, the cursor and whether more are waiting', () => {
    expect(
      readPulledPage({ events: [received], nextCursor: 'resume~a~b', hasMore: false }),
    ).toEqual({ events: [received], nextCursor: 'resume~a~b', hasMore: false });
    expect(readPulledPage({ events: [], nextCursor: null, hasMore: true })).toEqual({
      events: [],
      nextCursor: null,
      hasMore: true,
    });
  });

  it('drops an event the API never stamped, or one it cannot parse', () => {
    const unstamped = { ...received, id: buildEventId(2), receivedAt: null };
    expect(
      readPulledPage({
        events: [unstamped, { id: 'x' }, received],
        nextCursor: null,
        hasMore: false,
      })?.events,
    ).toEqual([received]);
  });

  it.each([
    ['no event list', { events: 'none', nextCursor: null, hasMore: false }],
    ['no hasMore', { events: [], nextCursor: null }],
    ['a cursor that is not text', { events: [], nextCursor: 7, hasMore: false }],
    ['a list', []],
  ])('answers null for a body with %s', (_reason, body) => {
    expect(readPulledPage(body)).toBeNull();
  });
});

describe('readPulledDeckLinePage', () => {
  it('reads the stamped deck line events and drops review events', () => {
    const line = {
      id: buildEventId(3),
      kind: 'line-removed',
      side: 'black',
      movesUci: ['e2e4'],
      openingName: null,
      occurredAt: '2026-01-10T08:00:00.000Z',
      calendarDay: '2026-11-13',
      deviceId: '11111111-1111-4111-8111-111111111111',
      receivedAt: RECEIVED_AT,
    };
    const review = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z', 'recalled', {
      receivedAt: RECEIVED_AT,
    });
    expect(
      readPulledDeckLinePage({ events: [line, review], nextCursor: null, hasMore: false }),
    ).toEqual({ events: [line], nextCursor: null, hasMore: false });
    expect(readPulledDeckLinePage([])).toBeNull();
  });
});
