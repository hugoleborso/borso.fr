/**
 * Shared TanStack Query client. Defaults:
 *  - reads stale-time: 30s — domain data changes infrequently in the
 *    band-ERP context, refetching every focus would be wasteful.
 *  - reads retry: 1 — one quick retry on transient network blip; more
 *    than that just delays the user-visible error.
 *  - mutations retry: 0 — writes are user-intentful and idempotency is
 *    not always guaranteed at the API layer; let the operator retry.
 */

import { QueryClient } from '@tanstack/react-query';

const DEFAULT_STALE_TIME_MS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: DEFAULT_STALE_TIME_MS, retry: 1 },
    mutations: { retry: 0 },
  },
});
