/** @Feature sessions */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { buildOptimisticSession } from './optimistic-session.core';
import { replaceEntityById, settleTemporaryEntity } from './optimistic.utils';

type SessionsListShape = InferResponseType<typeof api.api.sessions.$get>;
type SessionByIdShape = InferResponseType<(typeof api.api.sessions)[':id']['$get']>;

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

// @FollowsBlueprint query-optimistic-insert
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
      const temporaryId = crypto.randomUUID();
      const optimistic = buildOptimisticSession(temporaryId, variables);
      queryClient.setQueryData<SessionsListShape>(key, (old) =>
        old === undefined ? old : { ...old, sessions: [...old.sessions, optimistic] },
      );
      return { previous, temporaryId };
    },
    onSuccess: (data, _vars, context) => {
      queryClient.setQueryData<SessionsListShape>(sessionKeys.list(), (old) =>
        old === undefined
          ? old
          : {
              ...old,
              sessions: settleTemporaryEntity(old.sessions, context.temporaryId, data.session),
            },
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(sessionKeys.list(), context.previous);
      }
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
      const previousById = queryClient.getQueryData<SessionByIdShape>(byIdKey);
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
      queryClient.setQueryData<SessionByIdShape>(byIdKey, (old) => {
        if (old === undefined) return old;
        if (!('session' in old)) return old;
        return { session: { ...old.session, ...patch } };
      });
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
      queryClient.removeQueries({ queryKey: sessionKeys.byId(id) });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(sessionKeys.list(), context.previous);
      }
    },
  });
}
