import { QueryCache, QueryClient } from '@tanstack/react-query';
import { onSessionEnded } from './api.client';
import { authKeys, type SessionProbeResult } from './queries/auth.queries';
import { forgetSessionMarker } from './session-marker.adapter';

const DEFAULT_STALE_TIME_MS = 30_000;

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
    queries: { staleTime: DEFAULT_STALE_TIME_MS, retry: 1 },
    mutations: { retry: 0 },
  },
});

onSessionEnded(() => {
  forgetSessionMarker();
  queryClient.setQueryData<SessionProbeResult>(authKeys.session(), ENDED_SESSION);
});
