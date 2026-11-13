/** @Feature inspirations */

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readErrorBody } from '../api.client';
import {
  buildOptimisticInspiration,
  type InspirationAuthor,
  type InspirationFieldsShape,
  mergeInspirationChanges,
} from './inspiration-cache.core';
import { replaceEntityById, settleTemporaryEntity } from './optimistic.utils';

const INSPIRATIONS_WRITE_SCOPE = { id: 'inspirations-writes' } as const;

export const inspirationKeys = {
  all: ['inspirations'] as const,
  list: () => [...inspirationKeys.all, 'list'] as const,
};

type InspirationsListResponse = InferResponseType<typeof api.api.inspirations.$get, 200>;
export type InspirationRecord = InspirationsListResponse['inspirations'][number];
type InspirationCreateBody = Parameters<typeof api.api.inspirations.$post>[0]['json'];

export interface InspirationCreation {
  readonly inspiration: InspirationCreateBody;
  readonly author: InspirationAuthor | null;
}

export interface InspirationEdit {
  readonly id: string;
  readonly changes: InspirationFieldsShape;
}

interface ListSnapshot {
  readonly previousList: InspirationsListResponse | undefined;
}

async function writeList(
  queryClient: QueryClient,
  rewrite: (inspirations: readonly InspirationRecord[]) => InspirationRecord[],
): Promise<ListSnapshot> {
  const listKey = inspirationKeys.list();
  await queryClient.cancelQueries({ queryKey: listKey });
  const previousList = queryClient.getQueryData<InspirationsListResponse>(listKey);
  settleList(queryClient, rewrite);
  return { previousList };
}

function settleList(
  queryClient: QueryClient,
  rewrite: (inspirations: readonly InspirationRecord[]) => InspirationRecord[],
): void {
  queryClient.setQueryData<InspirationsListResponse>(inspirationKeys.list(), (old) => {
    if (old === undefined) return old;
    return { inspirations: rewrite(old.inspirations) };
  });
}

function restoreList(queryClient: QueryClient, snapshot: ListSnapshot | undefined): void {
  if (snapshot?.previousList === undefined) return;
  queryClient.setQueryData(inspirationKeys.list(), snapshot.previousList);
}

// @FollowsBlueprint query-module
export function useInspirationsList() {
  return useQuery({
    queryKey: inspirationKeys.list(),
    queryFn: async () => {
      const response = await api.api.inspirations.$get();
      if (!response.ok) {
        throw new ApiError(response.status, `inspirations ${response.status}`, null);
      }
      return response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-insert
export function useCreateInspiration() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: INSPIRATIONS_WRITE_SCOPE,
    mutationKey: inspirationKeys.all,
    mutationFn: async ({ inspiration }: InspirationCreation) => {
      const response = await api.api.inspirations.$post({ json: inspiration });
      if (!isResponseSuccessful(response)) {
        throw new ApiError(
          response.status,
          `create ${response.status}`,
          await readErrorBody(response),
        );
      }
      return response.json();
    },
    onMutate: async ({ inspiration, author }) => {
      const optimistic = buildOptimisticInspiration(inspiration, author, new Date().toISOString());
      const snapshot = await writeList(queryClient, (inspirations) => [
        optimistic,
        ...inspirations.filter((listed) => listed.id !== optimistic.id),
      ]);
      return { ...snapshot, temporaryId: optimistic.id };
    },
    onSuccess: (data, _variables, context) => {
      settleList(queryClient, (inspirations) =>
        settleTemporaryEntity(inspirations, context.temporaryId, data.inspiration),
      );
    },
    onError: (_error, _variables, context) => {
      restoreList(queryClient, context);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateInspiration() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: INSPIRATIONS_WRITE_SCOPE,
    mutationKey: inspirationKeys.all,
    mutationFn: async ({ id, changes }: InspirationEdit) => {
      const response = await api.api.inspirations[':id'].$patch({ param: { id }, json: changes });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `update ${response.status}`,
          await readErrorBody(response),
        );
      }
      return response.json();
    },
    onMutate: async ({ id, changes }) =>
      await writeList(queryClient, (inspirations) =>
        replaceEntityById(inspirations, id, (inspiration) =>
          mergeInspirationChanges(inspiration, changes),
        ),
      ),
    onSuccess: (data) => {
      if (!('inspiration' in data)) return;
      settleList(queryClient, (inspirations) =>
        replaceEntityById(inspirations, data.inspiration.id, () => data.inspiration),
      );
    },
    onError: (_error, _variables, context) => {
      restoreList(queryClient, context);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteInspiration() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: INSPIRATIONS_WRITE_SCOPE,
    mutationKey: inspirationKeys.all,
    mutationFn: async ({ id }: { readonly id: string }) => {
      const response = await api.api.inspirations[':id'].$delete({ param: { id } });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `delete ${response.status}`,
          await readErrorBody(response),
        );
      }
      return response.json();
    },
    onMutate: async ({ id }) =>
      await writeList(queryClient, (inspirations) =>
        inspirations.filter((inspiration) => inspiration.id !== id),
      ),
    onError: (_error, _variables, context) => {
      restoreList(queryClient, context);
    },
  });
}
