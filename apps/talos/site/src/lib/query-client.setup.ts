import { QueryClient } from '@tanstack/react-query';

const DEFAULT_STALE_TIME_MS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: DEFAULT_STALE_TIME_MS, retry: 1 },
    mutations: { retry: 0 },
  },
});
