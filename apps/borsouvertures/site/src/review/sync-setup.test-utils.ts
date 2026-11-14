import type { ReviewEvent } from '@domain/review-event.core';
import { vi } from 'vitest';
import { accountSessionQuery } from '@/lib/queries/account.queries';
import { queryClient } from '@/lib/query-client.setup';
import { readReviewLogRequest } from './review-log.store';
import { buildReviewEvent, LAPTOP } from './review.test-utils';

const CARD = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';

export const NEXT_CURSOR = 'page~2026-01-10T08:05:00.000Z~bbbbbbbb-bbbb-4bbb-8bbb-000000000001';

export const LAPTOP_REVIEW = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z', 'recalled', {
  deviceId: LAPTOP,
  receivedAt: '2026-01-10T08:05:00.000Z',
});

export const PHONE_REVIEW = buildReviewEvent(2, CARD, '2026-01-11T08:00:00.000Z');

export const LAST_CURSOR = 'page~2026-01-12T08:05:00.000Z~bbbbbbbb-bbbb-4bbb-8bbb-000000000003';

export const LATER_LAPTOP_REVIEW = buildReviewEvent(
  3,
  CARD,
  '2026-01-12T08:00:00.000Z',
  'recalled',
  { deviceId: LAPTOP, receivedAt: '2026-01-12T08:05:00.000Z' },
);

export interface StubbedApi {
  readonly pushStatus: number;
  readonly pulled: readonly ReviewEvent[];
}

export function stubApi(stubbed: StubbedApi): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(Response.json({}, { status: stubbed.pushStatus }));
      }
      return Promise.resolve(
        Response.json({ events: stubbed.pulled, nextCursor: NEXT_CURSOR, hasMore: false }),
      );
    }),
  );
}

const DECK_LINE_EVENTS_PATH = '/api/deck-line-events';
const EMPTY_PAGE = { events: [], nextCursor: null, hasMore: false };

export interface PulledPageAnswer {
  readonly events: readonly ReviewEvent[];
  readonly nextCursor: string;
  readonly hasMore: boolean;
}

function readRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

export function stubPagedPull(pageByCursor: ReadonlyMap<string | null, PulledPageAnswer>): {
  readonly cursorsAsked: (string | null)[];
} {
  const cursorsAsked: (string | null)[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(readRequestUrl(input), 'http://localhost');
      if (url.pathname === DECK_LINE_EVENTS_PATH) return Promise.resolve(Response.json(EMPTY_PAGE));
      const cursor = url.searchParams.get('after');
      cursorsAsked.push(cursor);
      const page = pageByCursor.get(cursor);
      if (page === undefined) return Promise.resolve(Response.json({}, { status: 404 }));
      return Promise.resolve(Response.json(page));
    }),
  );
  return { cursorsAsked };
}

export async function signInAndSync(): Promise<void> {
  await readReviewLogRequest();
  queryClient.setQueryData(accountSessionQuery.queryKey, { signedIn: true });
}

export function countBreadcrumbs(
  addBreadcrumb: { mock: { calls: unknown[][] } },
  name: string,
): number {
  return addBreadcrumb.mock.calls.filter(([crumb]) => isBreadcrumbNamed(crumb, name)).length;
}

function isBreadcrumbNamed(crumb: unknown, name: string): boolean {
  return (
    typeof crumb === 'object' && crumb !== null && 'message' in crumb && crumb.message === name
  );
}
