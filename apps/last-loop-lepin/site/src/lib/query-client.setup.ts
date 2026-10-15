import { MutationCache, QueryClient } from '@tanstack/react-query';
import { isSettledByRefetch } from './mutation-settlement.utils';

const RETRY_COUNT = 1;

export const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: async (_data, _variables, _context, mutation) => {
      const shouldRefetchEverything = isSettledByRefetch(mutation.options);
      if (shouldRefetchEverything) await queryClient.invalidateQueries();
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: RETRY_COUNT,
    },
  },
});
