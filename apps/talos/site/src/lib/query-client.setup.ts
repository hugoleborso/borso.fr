import { QueryCache, QueryClient } from '@tanstack/react-query';
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
