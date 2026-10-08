import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const messageKeys = {
  all: ['messages'] as const,
  claudeCodeTarget: () => [...messageKeys.all, 'claude-code-target'] as const,
};

// @FollowsBlueprint query-module
export function useClaudeCodeTarget() {
  return useQuery({
    queryKey: messageKeys.claudeCodeTarget(),
    queryFn: async () => {
      const response = await api.api.messages['claude-code'].$get();
      if (!response.ok) {
        throw new ApiError(response.status, `claude-code ${response.status}`, null);
      }
      return await response.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}
