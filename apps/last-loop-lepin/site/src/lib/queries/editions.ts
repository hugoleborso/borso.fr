/**
 * Edition reads and writes.
 *
 * A write splits on one question: can the client name the row the server will
 * return? Creating and replacing an edition cannot, because the server parses
 * the GPX track and computes the sunrise and sunset from it, so those two wait
 * for the response. Deleting one and moving it between statuses can, because
 * the request itself says exactly what the row becomes, so those two write the
 * cache first and reconcile from the response rather than from a fresh read.
 *
 * The distinction matters beyond the spinner: DSQL's read after write is per
 * connection, so a `GET` issued straight after a write can be served by a
 * Lambda whose connection still sees the pre commit snapshot. See
 * docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';
import { isLastPendingMutation, replaceEntityBySlug } from './optimistic.utils';

// @FollowsBlueprint query-module
export const editionKeys = {
  all: ['editions'] as const,
  list: () => [...editionKeys.all, 'list'] as const,
  current: () => [...editionKeys.all, 'current'] as const,
};

export interface CreateEditionVariables {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes: number;
  readonly gpxXml: string;
}

export interface ReplaceEditionVariables {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes: number;
  readonly gpxXml?: string;
}

export type EditionStatusName = 'setup' | 'live' | 'finished';

export interface TransitionEditionStatusVariables {
  readonly slug: string;
  readonly status: EditionStatusName;
}

interface CachedEdition {
  readonly slug: string;
  readonly status: EditionStatusName;
}

interface CachedEditionList {
  readonly editions: readonly CachedEdition[];
}

export function useCurrentEdition() {
  return useQuery({
    queryKey: editionKeys.current(),
    queryFn: async () => {
      const response = await api.api.editions.current.$get();
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}

export function useEditionList() {
  return useQuery({
    queryKey: editionKeys.list(),
    queryFn: async () => {
      const response = await api.api.editions.$get();
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useCreateEdition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: CreateEditionVariables) => {
      const response = await api.api.admin.editions.$post({ json: variables });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useReplaceEdition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: ReplaceEditionVariables) => {
      const { slug, ...body } = variables;
      const response = await api.api.admin.editions[':slug'].$put({ param: { slug }, json: body });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteEdition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: editionKeys.all,
    mutationFn: async (variables: { slug: string }) => {
      const response = await api.api.admin.editions[':slug'].$delete({
        param: { slug: variables.slug },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = editionKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<CachedEditionList>(listKey);
      queryClient.setQueryData<CachedEditionList>(listKey, (old) =>
        old === undefined
          ? old
          : { editions: old.editions.filter((edition) => edition.slug !== variables.slug) },
      );
      return { previousList };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(editionKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: editionKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useTransitionEditionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: editionKeys.all,
    mutationFn: async (variables: TransitionEditionStatusVariables) => {
      const response = await api.api.admin.editions[':slug'].status.$put({
        param: { slug: variables.slug },
        json: { status: variables.status },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = editionKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<CachedEditionList>(listKey);
      queryClient.setQueryData<CachedEditionList>(listKey, (old) =>
        old === undefined
          ? old
          : {
              editions: replaceEntityBySlug(old.editions, variables.slug, (edition) => ({
                ...edition,
                status: variables.status,
              })),
            },
      );
      return { previousList };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(editionKeys.list(), context.previousList);
      }
    },
    // The current-edition key is a different projection of the same row and
    // the client cannot name what it becomes, so it is refetched rather than
    // predicted.
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: editionKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}
