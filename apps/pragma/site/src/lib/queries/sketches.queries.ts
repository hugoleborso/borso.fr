/** @Feature sketches */

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readErrorBody } from '../api.client';
import {
  type ClipMove,
  moveClipInSketch,
  removeClipFromSketch,
  removeLaneFromSketch,
  renameLaneInSketch,
  type SketchShape,
  settleClipInSketch,
  settleLaneInSketch,
} from './sketch-cache.core';
import { writeKeepingStaleness } from './cache-write.queries';
import { inspirationKeys } from './inspirations.queries';
import { readSketchRefusal } from './sketch-refusal.core';

const SKETCH_WRITE_SCOPE = { id: 'sketch' } as const;

export const sketchKeys = {
  all: ['sketches'] as const,
  detail: (compositionId: string) => [...sketchKeys.all, compositionId] as const,
};

type SketchResponse = InferResponseType<(typeof api.api.sketches)[':compositionId']['$get'], 200>;
export type SketchRecord = SketchResponse['sketch'];

export interface LaneAddition {
  readonly compositionId: string;
  readonly id: string;
  readonly name: string;
  readonly position: number;
}

export interface LaneRename {
  readonly compositionId: string;
  readonly laneId: string;
  readonly name: string;
}

export interface LaneRemoval {
  readonly compositionId: string;
  readonly laneId: string;
}

export interface ClipPlacement {
  readonly compositionId: string;
  readonly id: string;
  readonly laneId: string;
  readonly inspirationId: string;
  readonly offsetSeconds: number;
}

export interface ClipMoveVariables extends ClipMove {
  readonly compositionId: string;
}

export interface ClipRemoval {
  readonly compositionId: string;
  readonly clipId: string;
}

interface SketchSnapshot {
  readonly previous: SketchResponse | undefined;
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

// @FollowsBlueprint query-module
export function useSketch(compositionId: string, isEnabled = true) {
  return useQuery({
    queryKey: sketchKeys.detail(compositionId),
    queryFn: async () => {
      const response = await api.api.sketches[':compositionId'].$get({ param: { compositionId } });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `sketch ${response.status}`,
          await readErrorBody(response),
        );
      }
      return response.json();
    },
    enabled: isEnabled,
  });
}

async function writeSketch(
  queryClient: QueryClient,
  compositionId: string,
  rewrite: (sketch: SketchShape) => SketchShape,
): Promise<SketchSnapshot> {
  const key = sketchKeys.detail(compositionId);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<SketchResponse>(key);
  settleSketch(queryClient, compositionId, rewrite);
  return { previous };
}

function settleSketch(
  queryClient: QueryClient,
  compositionId: string,
  rewrite: (sketch: SketchShape) => SketchShape,
): void {
  writeKeepingStaleness<SketchResponse>(queryClient, sketchKeys.detail(compositionId), (old) => {
    if (old === undefined) return old;
    return { sketch: rewrite(old.sketch) };
  });
}

function refreshSketchCounts(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: inspirationKeys.all });
}

function restoreSketch(
  queryClient: QueryClient,
  compositionId: string,
  snapshot: SketchSnapshot | undefined,
  error: unknown,
): void {
  if (snapshot?.previous !== undefined) {
    writeKeepingStaleness(queryClient, sketchKeys.detail(compositionId), snapshot.previous);
  }
  if (readSketchRefusal(error) === null) return;
  void queryClient.invalidateQueries({ queryKey: sketchKeys.detail(compositionId) });
}

// @FollowsBlueprint query-optimistic-mutation
export function useAddSketchLane() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ compositionId, ...lane }: LaneAddition) => {
      const response = await api.api.sketches[':compositionId'].lanes.$post({
        param: { compositionId },
        json: lane,
      });
      await throwUnlessSuccessful(response, 'add lane');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.compositionId, (sketch) =>
        settleLaneInSketch(sketch, { ...variables }),
      ),
    onSuccess: (data, variables) => {
      if (!('lane' in data)) return;
      settleSketch(queryClient, variables.compositionId, (sketch) =>
        settleLaneInSketch(sketch, data.lane),
      );
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.compositionId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRenameSketchLane() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ compositionId, laneId, name }: LaneRename) => {
      const response = await api.api.sketches[':compositionId'].lanes[':laneId'].$patch({
        param: { compositionId, laneId },
        json: { name },
      });
      await throwUnlessSuccessful(response, 'rename lane');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.compositionId, (sketch) =>
        renameLaneInSketch(sketch, variables.laneId, variables.name),
      ),
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.compositionId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteSketchLane() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ compositionId, laneId }: LaneRemoval) => {
      const response = await api.api.sketches[':compositionId'].lanes[':laneId'].$delete({
        param: { compositionId, laneId },
      });
      await throwUnlessSuccessful(response, 'delete lane');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.compositionId, (sketch) =>
        removeLaneFromSketch(sketch, variables.laneId),
      ),
    onSuccess: () => {
      refreshSketchCounts(queryClient);
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.compositionId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function usePlaceSketchClip() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ compositionId, ...clip }: ClipPlacement) => {
      const response = await api.api.sketches[':compositionId'].clips.$post({
        param: { compositionId },
        json: clip,
      });
      await throwUnlessSuccessful(response, 'place clip');
      return response.json();
    },
    onMutate: async ({ compositionId, ...clip }) =>
      await writeSketch(queryClient, compositionId, (sketch) => settleClipInSketch(sketch, clip)),
    onSuccess: (data, variables) => {
      refreshSketchCounts(queryClient);
      if (!('clip' in data)) return;
      settleSketch(queryClient, variables.compositionId, (sketch) =>
        settleClipInSketch(sketch, data.clip),
      );
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.compositionId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useMoveSketchClip() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ compositionId, clipId, laneId, offsetSeconds }: ClipMoveVariables) => {
      const response = await api.api.sketches[':compositionId'].clips[':clipId'].$patch({
        param: { compositionId, clipId },
        json: { laneId, offsetSeconds },
      });
      await throwUnlessSuccessful(response, 'move clip');
      return response.json();
    },
    onMutate: async ({ compositionId, ...move }) =>
      await writeSketch(queryClient, compositionId, (sketch) => moveClipInSketch(sketch, move)),
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.compositionId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRemoveSketchClip() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ compositionId, clipId }: ClipRemoval) => {
      const response = await api.api.sketches[':compositionId'].clips[':clipId'].$delete({
        param: { compositionId, clipId },
      });
      await throwUnlessSuccessful(response, 'remove clip');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.compositionId, (sketch) =>
        removeClipFromSketch(sketch, variables.clipId),
      ),
    onSuccess: () => {
      refreshSketchCounts(queryClient);
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.compositionId, context, error);
    },
  });
}
