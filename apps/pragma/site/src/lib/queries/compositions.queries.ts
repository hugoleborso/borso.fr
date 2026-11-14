/** @Feature compositions */

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readErrorBody } from '../api.client';
import { inspirationKeys } from './inspirations.queries';
import { replaceEntityById, settleTemporaryEntity } from './optimistic.utils';
import { settleCompositionInSketch } from './sketch-cache.core';
import { sketchKeys } from './sketches.queries';
import { songKeys } from './songs.queries';

const COMPOSITIONS_WRITE_SCOPE = { id: 'compositions-writes' } as const;

export const compositionKeys = {
  all: ['compositions'] as const,
  list: () => [...compositionKeys.all, 'list'] as const,
};

type CompositionsListResponse = InferResponseType<typeof api.api.compositions.$get, 200>;
export type CompositionRecord = CompositionsListResponse['compositions'][number];
type SketchResponse = InferResponseType<(typeof api.api.sketches)[':compositionId']['$get'], 200>;

export interface CompositionCreation {
  readonly id: string;
  readonly title: string;
}

export interface CompositionRename {
  readonly id: string;
  readonly title: string;
}

interface ListSnapshot {
  readonly previousList: CompositionsListResponse | undefined;
}

async function throwUnlessSuccessful(
  response: { readonly ok: boolean; readonly status: number; json: () => Promise<unknown> },
  label: string,
): Promise<void> {
  if (isResponseSuccessful(response)) return;
  throw new ApiError(
    response.status,
    `${label} ${String(response.status)}`,
    await readErrorBody(response),
  );
}

function settleList(
  queryClient: QueryClient,
  rewrite: (compositions: readonly CompositionRecord[]) => CompositionRecord[],
): void {
  queryClient.setQueryData<CompositionsListResponse>(compositionKeys.list(), (old) => {
    if (old === undefined) return old;
    return { compositions: rewrite(old.compositions) };
  });
}

async function writeList(
  queryClient: QueryClient,
  rewrite: (compositions: readonly CompositionRecord[]) => CompositionRecord[],
): Promise<ListSnapshot> {
  await queryClient.cancelQueries({ queryKey: compositionKeys.list() });
  const previousList = queryClient.getQueryData<CompositionsListResponse>(compositionKeys.list());
  settleList(queryClient, rewrite);
  return { previousList };
}

function restoreList(queryClient: QueryClient, snapshot: ListSnapshot | undefined): void {
  if (snapshot?.previousList === undefined) return;
  queryClient.setQueryData(compositionKeys.list(), snapshot.previousList);
}

function settleComposition(queryClient: QueryClient, composition: CompositionRecord): void {
  settleList(queryClient, (compositions) =>
    replaceEntityById(compositions, composition.id, () => composition),
  );
  queryClient.setQueryData<SketchResponse>(sketchKeys.detail(composition.id), (old) => {
    if (old === undefined) return old;
    return { sketch: settleCompositionInSketch(old.sketch, composition) };
  });
}

// @FollowsBlueprint query-module
export function useCompositions() {
  return useQuery({
    queryKey: compositionKeys.list(),
    queryFn: async () => {
      const response = await api.api.compositions.$get();
      if (!response.ok) {
        throw new ApiError(response.status, `compositions ${response.status}`, null);
      }
      return response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-insert
export function useCreateComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: COMPOSITIONS_WRITE_SCOPE,
    mutationKey: compositionKeys.all,
    mutationFn: async (composition: CompositionCreation) => {
      const response = await api.api.compositions.$post({ json: composition });
      await throwUnlessSuccessful(response, 'create composition');
      return response.json();
    },
    onMutate: async ({ id, title }) => {
      const optimistic: CompositionRecord = {
        id,
        title,
        songId: null,
        createdAt: new Date().toISOString(),
      };
      const snapshot = await writeList(queryClient, (compositions) => [
        optimistic,
        ...compositions.filter((listed) => listed.id !== id),
      ]);
      return { ...snapshot, temporaryId: id };
    },
    onSuccess: (data, _variables, context) => {
      if (!('composition' in data)) return;
      settleList(queryClient, (compositions) =>
        settleTemporaryEntity(compositions, context.temporaryId, data.composition),
      );
      queryClient.setQueryData<SketchResponse>(sketchKeys.detail(data.composition.id), {
        sketch: { composition: data.composition, lanes: [], clips: [] },
      });
    },
    onError: (_error, _variables, context) => {
      restoreList(queryClient, context);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRenameComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: COMPOSITIONS_WRITE_SCOPE,
    mutationKey: compositionKeys.all,
    mutationFn: async ({ id, title }: CompositionRename) => {
      const response = await api.api.compositions[':id'].$patch({
        param: { id },
        json: { title },
      });
      await throwUnlessSuccessful(response, 'rename composition');
      return response.json();
    },
    onMutate: async ({ id, title }) => {
      const previousSketch = queryClient.getQueryData<SketchResponse>(sketchKeys.detail(id));
      const snapshot = await writeList(queryClient, (compositions) =>
        replaceEntityById(compositions, id, (composition) => ({ ...composition, title })),
      );
      if (previousSketch !== undefined) {
        settleComposition(queryClient, { ...previousSketch.sketch.composition, title });
      }
      return { ...snapshot, previousSketch };
    },
    onSuccess: (data) => {
      if (!('composition' in data)) return;
      settleComposition(queryClient, data.composition);
    },
    onError: (_error, variables, context) => {
      restoreList(queryClient, context);
      if (context?.previousSketch === undefined) return;
      queryClient.setQueryData(sketchKeys.detail(variables.id), context.previousSketch);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: COMPOSITIONS_WRITE_SCOPE,
    mutationKey: compositionKeys.all,
    mutationFn: async ({ id }: { readonly id: string }) => {
      const response = await api.api.compositions[':id'].$delete({ param: { id } });
      await throwUnlessSuccessful(response, 'delete composition');
      return response.json();
    },
    onMutate: async ({ id }) =>
      await writeList(queryClient, (compositions) =>
        compositions.filter((composition) => composition.id !== id),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inspirationKeys.all });
    },
    onError: (_error, _variables, context) => {
      restoreList(queryClient, context);
    },
  });
}

export function useCatalogueComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: COMPOSITIONS_WRITE_SCOPE,
    mutationKey: compositionKeys.all,
    mutationFn: async ({ id }: { readonly id: string }) => {
      const response = await api.api.compositions[':id'].catalogue.$post({ param: { id } });
      await throwUnlessSuccessful(response, 'catalogue composition');
      return response.json();
    },
    onSuccess: (data) => {
      if (!('composition' in data)) return;
      settleComposition(queryClient, data.composition);
      void queryClient.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}
