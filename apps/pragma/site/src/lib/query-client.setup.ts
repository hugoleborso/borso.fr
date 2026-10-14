import { MutationCache, QueryClient } from '@tanstack/react-query';
import { isSettledByRefetch } from './mutation-settlement.utils';

const DEFAULT_STALE_TIME_MS = 30_000;

export const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: async (_data, _variables, _context, mutation) => {
      const shouldRefetchEverything = isSettledByRefetch(mutation.options);
      if (shouldRefetchEverything) await queryClient.invalidateQueries();
    },
  }),
  defaultOptions: {
    queries: { staleTime: DEFAULT_STALE_TIME_MS, retry: 1 },
    mutations: { retry: 0 },
  },
});
