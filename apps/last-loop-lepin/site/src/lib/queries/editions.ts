import { selectCurrentEdition } from '@domain/edition-selection.core';
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

type CachedCurrentEdition = InferResponseType<typeof api.api.editions.current.$get>;

function writeTheCurrentEditionDerivedFrom(
  queryClient: QueryClient,
  list: CachedEditionList | undefined,
): void {
  if (list === undefined) return;
  queryClient.setQueryData<CachedCurrentEdition>(editionKeys.current(), {
    edition: selectCurrentEdition(list.editions),
  });
}

function rollBackTheEditionCaches(
  queryClient: QueryClient,
  previousList: CachedEditionList | undefined,
  previousCurrent: CachedCurrentEdition | undefined,
): void {
  if (previousList === undefined) return;
  queryClient.setQueryData(editionKeys.list(), previousList);
  queryClient.setQueryData(editionKeys.current(), previousCurrent);
}

async function snapshotTheEditionCaches(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: editionKeys.all });
  return {
    previousList: queryClient.getQueryData<CachedEditionList>(editionKeys.list()),
    previousCurrent: queryClient.getQueryData<CachedCurrentEdition>(editionKeys.current()),
  };
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
      const snapshot = await snapshotTheEditionCaches(queryClient);
      const nextList =
        snapshot.previousList === undefined
          ? undefined
          : {
              editions: snapshot.previousList.editions.filter(
                (edition) => edition.slug !== variables.slug,
              ),
            };
      if (nextList !== undefined) queryClient.setQueryData(editionKeys.list(), nextList);
      writeTheCurrentEditionDerivedFrom(queryClient, nextList);
      return snapshot;
    },
    onError: (_error, _variables, context) => {
      rollBackTheEditionCaches(queryClient, context?.previousList, context?.previousCurrent);
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
      const snapshot = await snapshotTheEditionCaches(queryClient);
      const nextList =
        snapshot.previousList === undefined
          ? undefined
          : {
              editions: replaceEntityBySlug(
                snapshot.previousList.editions,
                variables.slug,
                (edition) => ({ ...edition, status: variables.status }),
              ),
            };
      if (nextList !== undefined) queryClient.setQueryData(editionKeys.list(), nextList);
      writeTheCurrentEditionDerivedFrom(queryClient, nextList);
      return snapshot;
    },
    onError: (_error, _variables, context) => {
      rollBackTheEditionCaches(queryClient, context?.previousList, context?.previousCurrent);
    },
  });
}
