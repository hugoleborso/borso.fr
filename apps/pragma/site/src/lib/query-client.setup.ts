/** @DependsOnExternal browser-local-storage */

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { hashKey, type Query, QueryCache, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import { isBandDataQuery } from '../components/organisms/session-gate.core';
import { onSessionEnded } from './api.client';
import { authKeys, type SessionProbeResult } from './queries/auth.queries';
import { loadOfflineReadingWhenSignedIn } from './queries/offline-reading.queries';
import { isSignInUpdate } from './queries/offline-reading.utils';
import { forgetSessionMarker } from './session-marker.adapter';
import { writeKeepingStaleness } from './queries/cache-write.queries';

const DEFAULT_STALE_TIME_MS = 300_000;
const PERSISTED_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PERSISTED_CACHE_KEY = 'pragma.query-cache';
const PERSISTED_CACHE_SHAPE_VERSION = '1';

const ENDED_SESSION: SessionProbeResult = { authenticated: false };

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { readonly reportFailure?: (error: Error) => void };
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => query.meta?.reportFailure?.(error),
  }),
  defaultOptions: {
    queries: { staleTime: DEFAULT_STALE_TIME_MS, gcTime: PERSISTED_CACHE_MAX_AGE_MS, retry: 0 },
    mutations: { retry: 0 },
  },
});

const queryCachePersister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: PERSISTED_CACHE_KEY,
});

function isMutationPersisted(): boolean {
  return false;
}

export const queryCachePersistOptions = {
  persister: queryCachePersister,
  maxAge: PERSISTED_CACHE_MAX_AGE_MS,
  buster: PERSISTED_CACHE_SHAPE_VERSION,
  dehydrateOptions: { shouldDehydrateMutation: isMutationPersisted },
} satisfies PersistQueryClientProviderProps['persistOptions'];

export function startOfflineReading(): void {
  void loadOfflineReadingWhenSignedIn(queryClient);
}

const SESSION_QUERY_HASH = hashKey(authKeys.session());

queryClient.getQueryCache().subscribe((event) => {
  const isSignIn = isSignInUpdate(
    {
      eventType: event.type,
      actionType: event.type === 'updated' ? event.action.type : undefined,
      queryHash: event.query.queryHash,
      data: event.query.state.data,
    },
    SESSION_QUERY_HASH,
  );
  if (isSignIn) startOfflineReading();
});

function isBandDataInCache(query: Query): boolean {
  return isBandDataQuery(query.queryKey);
}

onSessionEnded(() => {
  forgetSessionMarker();
  queryClient.removeQueries({ predicate: isBandDataInCache });
  writeKeepingStaleness<SessionProbeResult>(queryClient, authKeys.session(), ENDED_SESSION);
  void queryCachePersister.removeClient();
});
