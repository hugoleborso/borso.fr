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
