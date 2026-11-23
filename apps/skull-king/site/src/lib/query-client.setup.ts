import { QueryClient } from '@tanstack/react-query';

const GAME_STATE_STALE_TIME_MS = 2_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: GAME_STATE_STALE_TIME_MS, retry: 1 },
    mutations: { retry: 0 },
  },
});
