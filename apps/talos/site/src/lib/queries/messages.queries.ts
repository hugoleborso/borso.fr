import { useMutation } from '@tanstack/react-query';
import { ApiError, api, readFailureBody } from '../api.client';
import { useMutationToasts } from '../toast.hook';
import { MESSAGE_SENT_TOAST } from './mutation-toasts.core';

// @FollowsBlueprint query-uncached-mutation
export function useSendMessage() {
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (text: string) => {
      const response = await api.api.messages.$post({ json: { text } });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `message ${response.status}`,
          await readFailureBody(response),
        );
      }
      return await response.json();
    },
    onSuccess: () => {
      toasts.confirm(MESSAGE_SENT_TOAST);
    },
    onError: (failure) => {
      toasts.fail(failure, 'message.error');
    },
  });
}
