import {
  hashKey,
  QueryCache,
  QueryClient,
  type QueryCacheNotifyEvent,
} from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api } from './api.client';
import { showAppBadge } from './app-badge.adapter';
import { todayKeys } from './queries/today.queries';
import { sessionKeys, SIGNED_OUT } from './queries/session.queries';
import { isEndedSessionFailure } from './session-end.core';

const DEFAULT_STALE_TIME_MS = 30_000;

function endSessionOn(failure: unknown): void {
  if (!isEndedSessionFailure(failure)) return;
  queryClient.setQueryData(sessionKeys.current(), SIGNED_OUT);
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: endSessionOn }),
  defaultOptions: {
    queries: { staleTime: DEFAULT_STALE_TIME_MS, retry: 1 },
    mutations: { retry: 0 },
  },
});

type TodayOverview = InferResponseType<typeof api.api.today.$get, 200>;
const TODAY_OVERVIEW_HASH = hashKey(todayKeys.overview());

function mirrorPendingCountOnAppIcon(event: QueryCacheNotifyEvent): void {
  if (event.type !== 'updated' || event.query.queryHash !== TODAY_OVERVIEW_HASH) return;
  const overview = queryClient.getQueryData<TodayOverview>(todayKeys.overview());
  if (overview !== undefined) showAppBadge(overview.pendingProposalCount);
}

queryClient.getQueryCache().subscribe(mirrorPendingCountOnAppIcon);
