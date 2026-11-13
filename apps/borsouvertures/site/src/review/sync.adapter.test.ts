import { describe, expect, it } from 'vitest';
import { buildApiClient } from '@/lib/api.client';
import { pullReviewEvents, pushReviewEvents, SyncRejectedError } from './sync.adapter';
import { buildEventId, buildReviewEvent } from './review.test-utils';

const CARD = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';
const RECEIVED_AT = '2026-01-10T08:00:09.000Z';
const EVENT = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z');

interface SentRequest {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
  readonly credentials: RequestCredentials | undefined;
}

function buildJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function buildFakeApi(answer: () => Response) {
  const sent: SentRequest[] = [];
  const client = buildApiClient((input, init) => {
    const body = init?.body;
    sent.push({
      url: input instanceof Request ? input.url : String(input),
      method: init?.method ?? 'GET',
      body: typeof body === 'string' ? JSON.parse(body) : null,
      credentials: init?.credentials,
    });
    return Promise.resolve(answer());
  });
  return { client, sent };
}

function buildOfflineApi() {
  return buildApiClient(() => Promise.reject(new TypeError('Failed to fetch')));
}

// @FollowsBlueprint test-pure-unit
describe('pushReviewEvents', () => {
  it('posts the batch with the session cookie and answers the receipts', async () => {
    const api = buildFakeApi(() =>
      buildJsonResponse(200, { accepted: [{ id: EVENT.id, receivedAt: RECEIVED_AT }] }),
    );
    await expect(pushReviewEvents(api.client, [EVENT])).resolves.toEqual({
      outcome: 'synced',
      receipts: [{ id: EVENT.id, receivedAt: RECEIVED_AT }],
    });
    expect(api.sent).toHaveLength(1);
    expect(api.sent[0]?.method).toBe('POST');
    expect(api.sent[0]?.url).toMatch(/\/api\/review-events$/);
    expect(api.sent[0]?.body).toEqual({ events: [EVENT] });
    expect(api.sent[0]?.credentials).toBe('include');
  });

  it('answers signed-out to a 401 and reports nothing', async () => {
    const api = buildFakeApi(() => buildJsonResponse(401, { error: 'session-required' }));
    await expect(pushReviewEvents(api.client, [EVENT])).resolves.toEqual({
      outcome: 'signed-out',
    });
  });

  it('answers rejected to a 400, with the error Sentry receives tagged by status and route', async () => {
    const api = buildFakeApi(() => buildJsonResponse(400, { success: false }));
    const pushOutcome = await pushReviewEvents(api.client, [EVENT]);
    expect(pushOutcome.outcome).toBe('rejected');
    const error = 'error' in pushOutcome ? pushOutcome.error : null;
    expect(error).toBeInstanceOf(SyncRejectedError);
    expect(error).toMatchObject({
      name: 'SyncRejectedError',
      message: 'The API refused the review events with 400 on POST /api/review-events.',
      tags: { status: '400', route: 'POST /api/review-events' },
    });
  });

  it('answers offline when the network fails, when the API fails, or when no API answers', async () => {
    await expect(pushReviewEvents(buildOfflineApi(), [EVENT])).resolves.toEqual({
      outcome: 'offline',
    });
    const failing = buildFakeApi(() => buildJsonResponse(503, { error: 'unavailable' }));
    await expect(pushReviewEvents(failing.client, [EVENT])).resolves.toEqual({
      outcome: 'offline',
    });
    const staticHost = buildFakeApi(
      () =>
        new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    await expect(pushReviewEvents(staticHost.client, [EVENT])).resolves.toEqual({
      outcome: 'offline',
    });
    const otherJson = buildFakeApi(() => buildJsonResponse(200, { ok: true }));
    await expect(pushReviewEvents(otherJson.client, [EVENT])).resolves.toEqual({
      outcome: 'offline',
    });
  });
});

describe('pullReviewEvents', () => {
  const received = { ...EVENT, id: buildEventId(2), receivedAt: RECEIVED_AT };

  it('reads from the beginning when the device holds no cursor', async () => {
    const api = buildFakeApi(() =>
      buildJsonResponse(200, { events: [received], nextCursor: 'resume~a~b', hasMore: false }),
    );
    await expect(pullReviewEvents(api.client, null)).resolves.toEqual({
      outcome: 'synced',
      events: [received],
      nextCursor: 'resume~a~b',
      hasMore: false,
    });
    expect(api.sent[0]?.method).toBe('GET');
    expect(api.sent[0]?.url).toMatch(/\/api\/review-events$/);
  });

  it('sends the cursor it holds', async () => {
    const api = buildFakeApi(() =>
      buildJsonResponse(200, { events: [], nextCursor: null, hasMore: false }),
    );
    await pullReviewEvents(api.client, 'page~2026-01-10T08:00:09.000Z~x');
    expect(new URL(api.sent[0]?.url ?? '', 'http://localhost').searchParams.get('after')).toBe(
      'page~2026-01-10T08:00:09.000Z~x',
    );
  });

  it('answers rejected with the pull route, and signed-out to a 401', async () => {
    const rejected = await pullReviewEvents(
      buildFakeApi(() => buildJsonResponse(403, {})).client,
      null,
    );
    expect(rejected).toMatchObject({
      outcome: 'rejected',
      error: { tags: { status: '403', route: 'GET /api/review-events' } },
    });
    await expect(
      pullReviewEvents(buildFakeApi(() => buildJsonResponse(401, {})).client, null),
    ).resolves.toEqual({ outcome: 'signed-out' });
    await expect(pullReviewEvents(buildOfflineApi(), null)).resolves.toEqual({
      outcome: 'offline',
    });
  });
});
