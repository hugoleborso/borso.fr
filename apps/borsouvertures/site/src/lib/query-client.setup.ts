import { QueryClient } from '@tanstack/react-query';

// @FollowsBlueprint browser-edge-module
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
