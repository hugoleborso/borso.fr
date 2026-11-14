import type { ReviewEvent } from '@domain/review-event.core';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { jsonRequest, signInForCookie, writeOperatorCredential } from '../../../test/auth-utils';
import { countReviewEvents, truncateAllTables } from '../../../test/database-utils';

const DEVICE_ID = '5a5a5a5a-0000-4000-8000-00000000d0d0';
const CARD_ID = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';
const FIRST_INSTANT = new Date('2026-11-13T10:00:00.000Z');
const MILLISECONDS_PER_SECOND = 1_000;

const receiptsSchema = z.object({
  accepted: z.array(z.object({ id: z.string(), receivedAt: z.string() })),
});
const pageSchema = z.object({
  events: z.array(z.object({ id: z.string(), receivedAt: z.string() })),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

function buildEventId(index: number): string {
  return `7d3c1b2a-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function buildEvent(index: number): ReviewEvent {
  return {
    id: buildEventId(index),
    cardId: CARD_ID,
    outcome: 'recalled',
    reviewedAt: '2026-11-13T09:00:00.000Z',
    calendarDay: '2026-11-13',
    deviceId: DEVICE_ID,
    receivedAt: null,
  };
}

function buildEvents(first: number, count: number): ReviewEvent[] {
  return Array.from({ length: count }, (_unused, offset) => buildEvent(first + offset));
}

const clock = { now: FIRST_INSTANT };
const app = createApp({ reviewEvents: { clock: () => clock.now } });

async function push(cookie: string, events: readonly ReviewEvent[]) {
  const response = await jsonRequest(app, 'POST', '/api/review-events', {
    cookie,
    body: { events },
  });
  expect(response.status).toBe(200);
  return receiptsSchema.parse(await response.json()).accepted;
}

async function pull(cookie: string, after?: string) {
  const query = after === undefined ? '' : `?after=${encodeURIComponent(after)}`;
  const response = await jsonRequest(app, 'GET', `/api/review-events${query}`, { cookie });
  expect(response.status).toBe(200);
  return pageSchema.parse(await response.json());
}

// @FollowsBlueprint test-back-e2e
describe('the review-events routes', () => {
  beforeEach(async () => {
    await truncateAllTables();
    await writeOperatorCredential();
    clock.now = FIRST_INSTANT;
  });

  it('answers 401 to a push and a pull without a session', async () => {
    const pushed = await jsonRequest(app, 'POST', '/api/review-events', {
      body: { events: [buildEvent(1)] },
    });
    expect(pushed.status).toBe(401);
    expect((await jsonRequest(app, 'GET', '/api/review-events')).status).toBe(401);
    expect(await countReviewEvents()).toBe(0);
  });

  it('stores a batch pushed twice once, and answers the stored receivedAt both times', async () => {
    const cookie = await signInForCookie(app);
    const first = await push(cookie, buildEvents(1, 3));
    clock.now = new Date(FIRST_INSTANT.getTime() + 30 * MILLISECONDS_PER_SECOND);
    const second = await push(cookie, buildEvents(1, 3));
    expect(await countReviewEvents()).toBe(3);
    expect(second).toEqual(first);
    expect(first.map((receipt) => receipt.receivedAt)).toEqual([
      FIRST_INSTANT.toISOString(),
      FIRST_INSTANT.toISOString(),
      FIRST_INSTANT.toISOString(),
    ]);
  });

  it('stores a batch pushed twice at once from two sessions once, and answers both with the same receipts', async () => {
    const [firstCookie, secondCookie] = [await signInForCookie(app), await signInForCookie(app)];
    const [first, second] = await Promise.all([
      push(firstCookie, buildEvents(1, 3)),
      push(secondCookie, buildEvents(1, 3)),
    ]);
    expect(second).toEqual(first);
    expect(first.map((receipt) => receipt.id)).toEqual([
      buildEventId(1),
      buildEventId(2),
      buildEventId(3),
    ]);
    expect(await countReviewEvents()).toBe(3);
  });

  it('answers an empty receipt list to an empty batch', async () => {
    const cookie = await signInForCookie(app);
    expect(await push(cookie, [])).toEqual([]);
  });

  it('refuses a batch above five hundred events and an event it cannot parse', async () => {
    const cookie = await signInForCookie(app);
    const tooMany = await jsonRequest(app, 'POST', '/api/review-events', {
      cookie,
      body: { events: buildEvents(1, 501) },
    });
    expect(tooMany.status).toBe(400);
    const unparsable = await jsonRequest(app, 'POST', '/api/review-events', {
      cookie,
      body: { events: [{ ...buildEvent(1), outcome: 'hard' }] },
    });
    expect(unparsable.status).toBe(400);
    expect(await countReviewEvents()).toBe(0);
  });

  it('returns only events after the cursor, and again those inside the one-minute overlap', async () => {
    const cookie = await signInForCookie(app);
    await push(cookie, [buildEvent(1)]);
    const firstPage = await pull(cookie);
    expect(firstPage.events.map((event) => event.id)).toEqual([buildEventId(1)]);
    expect(firstPage.hasMore).toBe(false);
    const cursor = firstPage.nextCursor ?? '';

    clock.now = new Date(FIRST_INSTANT.getTime() + 30 * MILLISECONDS_PER_SECOND);
    await push(cookie, [buildEvent(2)]);
    clock.now = new Date(FIRST_INSTANT.getTime() + 5 * 60 * MILLISECONDS_PER_SECOND);
    await push(cookie, [buildEvent(3)]);

    const overlapping = await pull(cookie, cursor);
    expect(overlapping.events.map((event) => event.id)).toEqual([
      buildEventId(1),
      buildEventId(2),
      buildEventId(3),
    ]);

    const afterLast = await pull(cookie, overlapping.nextCursor ?? '');
    expect(afterLast.events.map((event) => event.id)).toEqual([buildEventId(3)]);
  });

  it('pages five hundred events at a time and says when more are waiting', async () => {
    const cookie = await signInForCookie(app);
    await push(cookie, buildEvents(1, 500));
    await push(cookie, buildEvents(501, 2));
    const firstPage = await pull(cookie);
    expect(firstPage.events).toHaveLength(500);
    expect(firstPage.hasMore).toBe(true);
    const secondPage = await pull(cookie, firstPage.nextCursor ?? '');
    expect(secondPage.events.map((event) => event.id)).toEqual([
      buildEventId(501),
      buildEventId(502),
    ]);
    expect(secondPage.hasMore).toBe(false);
  });

  it('starts at the beginning for a cursor it cannot read', async () => {
    const cookie = await signInForCookie(app);
    await push(cookie, [buildEvent(1)]);
    const page = await pull(cookie, 'not-a-cursor');
    expect(page.events.map((event) => event.id)).toEqual([buildEventId(1)]);
  });
});
