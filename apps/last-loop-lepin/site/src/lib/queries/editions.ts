import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';
import { isLastPendingMutation, replaceEntityBySlug } from './optimistic.utils';

// @FollowsBlueprint query-module
export const editionKeys = {
  all: ['editions'] as const,
  list: () => [...editionKeys.all, 'list'] as const,
  current: () => [...editionKeys.all, 'current'] as const,
};

function refetchEditionProjectionsTheClientCannotPredict(queryClient: QueryClient): void {
  if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: editionKeys.all }))) return;
  void queryClient.invalidateQueries({ queryKey: editionKeys.all });
}

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
      refetchEditionProjectionsTheClientCannotPredict(queryClient);
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
    onSettled: () => {
      refetchEditionProjectionsTheClientCannotPredict(queryClient);
    },
  });
}
