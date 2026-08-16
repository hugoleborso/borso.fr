/**
 * Sessions feature queries / mutations. Practices + concerts share the
 * `/api/sessions` endpoint via single-table inheritance on `kind`.
 * @Feature sessions
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { buildOptimisticSession } from './optimistic-session.core';
import { isLastPendingMutation, replaceEntityById } from './optimistic.utils';

type SessionsListShape = InferResponseType<typeof api.api.sessions.$get>;

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
  byId: (id: string) => [...sessionKeys.all, 'byId', id] as const,
};

export function useSessionsList() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: async () => {
      const response = await api.api.sessions.$get();
      if (!response.ok) throw new ApiError(response.status, `sessions ${response.status}`, null);
      return response.json();
    },
  });
}

export function useSession(id: string, isEnabled = true) {
  return useQuery({
    queryKey: sessionKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.sessions[':id'].$get({ param: { id } });
      if (!response.ok) throw new ApiError(response.status, `session ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: sessionKeys.all,
    mutationFn: async (variables: Parameters<typeof api.api.sessions.$post>[0]['json']) => {
      const response = await api.api.sessions.$post({ json: variables });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const key = sessionKeys.list();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SessionsListShape>(key);
      const optimistic = buildOptimisticSession(crypto.randomUUID(), variables);
      queryClient.setQueryData<SessionsListShape>(key, (old) =>
        old === undefined ? old : { ...old, sessions: [...old.sessions, optimistic] },
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(sessionKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: sessionKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: sessionKeys.all,
    mutationFn: async (
      variables: { id: string } & Parameters<(typeof api.api.sessions)[':id']['$put']>[0]['json'],
    ) => {
      const { id, ...rest } = variables;
      const response = await api.api.sessions[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = sessionKeys.list();
      const byIdKey = sessionKeys.byId(variables.id);
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: byIdKey });
      const previousList = queryClient.getQueryData<SessionsListShape>(listKey);
      const previousById = queryClient.getQueryData(byIdKey);
      const { id, ...patch } = variables;
      queryClient.setQueryData<SessionsListShape>(listKey, (old) =>
        old === undefined
          ? old
          : {
              ...old,
              sessions: replaceEntityById(old.sessions, id, (session) => ({
                ...session,
                ...patch,
              })),
            },
      );
      return { previousList, previousById };
    },
    onError: (_err, variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(sessionKeys.list(), context.previousList);
      }
      if (context?.previousById !== undefined) {
        queryClient.setQueryData(sessionKeys.byId(variables.id), context.previousById);
      }
    },
    onSettled: (_data, _err, variables) => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: sessionKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: sessionKeys.byId(variables.id) });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: sessionKeys.all,
    mutationFn: async ({ id }: { id: string }) => {
      const response = await api.api.sessions[':id'].$delete({ param: { id } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async ({ id }) => {
      const key = sessionKeys.list();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SessionsListShape>(key);
      queryClient.setQueryData<SessionsListShape>(key, (old) =>
        old === undefined
          ? old
          : { ...old, sessions: old.sessions.filter((session) => session.id !== id) },
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(sessionKeys.list(), context.previous);
      }
    },
    onSettled: (_data, _err, { id }) => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: sessionKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.byId(id) });
    },
  });
}
