import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api } from '../api';
import { replaceEntityBySlug } from './optimistic.utils';

// @FollowsBlueprint query-module
export const editionKeys = {
  all: ['editions'] as const,
  list: () => [...editionKeys.all, 'list'] as const,
  current: () => [...editionKeys.all, 'current'] as const,
};

function refetchTheCurrentEditionProjection(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: editionKeys.current() });
}

export type CreateEditionVariables = Parameters<typeof api.api.admin.editions.$post>[0]['json'];

export type ReplaceEditionVariables = { readonly slug: string } & Parameters<
  (typeof api.api.admin.editions)[':slug']['$put']
>[0]['json'];

export type TransitionEditionStatusVariables = { readonly slug: string } & Parameters<
  (typeof api.api.admin.editions)[':slug']['status']['$put']
>[0]['json'];

type CachedEditionList = InferResponseType<typeof api.api.editions.$get>;

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
      // eslint-disable-next-line borso/no-refetch-of-optimistically-written-query -- this refetches `current()`, which is not a key this mutation wrote. It is a projection over every edition (live, else earliest setup by startsAt, else latest finished by endsAt — getCurrentEdition in edition.service.ts), and the write that just ran touched one edition, so the client cannot tell which edition the projection now names. A transition or a delete can hand current to a different edition entirely.
      refetchTheCurrentEditionProjection(queryClient);
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
      // eslint-disable-next-line borso/no-refetch-of-optimistically-written-query -- this refetches `current()`, which is not a key this mutation wrote. It is a projection over every edition (live, else earliest setup by startsAt, else latest finished by endsAt — getCurrentEdition in edition.service.ts), and the write that just ran touched one edition, so the client cannot tell which edition the projection now names. A transition or a delete can hand current to a different edition entirely.
      refetchTheCurrentEditionProjection(queryClient);
    },
  });
}
