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
import { inspirationKeys } from './inspirations.queries';
import { readSketchRefusal } from './sketch-refusal.core';

const SKETCH_WRITE_SCOPE = { id: 'sketch' } as const;

export const sketchKeys = {
  all: ['sketches'] as const,
  detail: (songId: string) => [...sketchKeys.all, songId] as const,
};

type SketchResponse = InferResponseType<(typeof api.api.sketches)[':songId']['$get'], 200>;
export type SketchRecord = SketchResponse['sketch'];

export interface LaneAddition {
  readonly songId: string;
  readonly id: string;
  readonly name: string;
  readonly position: number;
}

export interface LaneRename {
  readonly songId: string;
  readonly laneId: string;
  readonly name: string;
}

export interface LaneRemoval {
  readonly songId: string;
  readonly laneId: string;
}

export interface ClipPlacement {
  readonly songId: string;
  readonly id: string;
  readonly laneId: string;
  readonly inspirationId: string;
  readonly offsetSeconds: number;
}

export interface ClipMoveVariables extends ClipMove {
  readonly songId: string;
}

export interface ClipRemoval {
  readonly songId: string;
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
export function useSketch(songId: string, isEnabled = true) {
  return useQuery({
    queryKey: sketchKeys.detail(songId),
    queryFn: async () => {
      const response = await api.api.sketches[':songId'].$get({ param: { songId } });
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
  songId: string,
  rewrite: (sketch: SketchShape) => SketchShape,
): Promise<SketchSnapshot> {
  const key = sketchKeys.detail(songId);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<SketchResponse>(key);
  settleSketch(queryClient, songId, rewrite);
  return { previous };
}

function settleSketch(
  queryClient: QueryClient,
  songId: string,
  rewrite: (sketch: SketchShape) => SketchShape,
): void {
  queryClient.setQueryData<SketchResponse>(sketchKeys.detail(songId), (old) => {
    if (old === undefined) return old;
    return { sketch: rewrite(old.sketch) };
  });
}

function refreshSketchCounts(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: inspirationKeys.all });
}

function restoreSketch(
  queryClient: QueryClient,
  songId: string,
  snapshot: SketchSnapshot | undefined,
  error: unknown,
): void {
  if (snapshot?.previous !== undefined) {
    queryClient.setQueryData(sketchKeys.detail(songId), snapshot.previous);
  }
  if (readSketchRefusal(error) === null) return;
  void queryClient.invalidateQueries({ queryKey: sketchKeys.detail(songId) });
}

// @FollowsBlueprint query-optimistic-mutation
export function useAddSketchLane() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ songId, ...lane }: LaneAddition) => {
      const response = await api.api.sketches[':songId'].lanes.$post({
        param: { songId },
        json: lane,
      });
      await throwUnlessSuccessful(response, 'add lane');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.songId, (sketch) =>
        settleLaneInSketch(sketch, { ...variables }),
      ),
    onSuccess: (data, variables) => {
      if (!('lane' in data)) return;
      settleSketch(queryClient, variables.songId, (sketch) =>
        settleLaneInSketch(sketch, data.lane),
      );
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.songId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRenameSketchLane() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ songId, laneId, name }: LaneRename) => {
      const response = await api.api.sketches[':songId'].lanes[':laneId'].$patch({
        param: { songId, laneId },
        json: { name },
      });
      await throwUnlessSuccessful(response, 'rename lane');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.songId, (sketch) =>
        renameLaneInSketch(sketch, variables.laneId, variables.name),
      ),
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.songId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteSketchLane() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ songId, laneId }: LaneRemoval) => {
      const response = await api.api.sketches[':songId'].lanes[':laneId'].$delete({
        param: { songId, laneId },
      });
      await throwUnlessSuccessful(response, 'delete lane');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.songId, (sketch) =>
        removeLaneFromSketch(sketch, variables.laneId),
      ),
    onSuccess: () => {
      refreshSketchCounts(queryClient);
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.songId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function usePlaceSketchClip() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ songId, ...clip }: ClipPlacement) => {
      const response = await api.api.sketches[':songId'].clips.$post({
        param: { songId },
        json: clip,
      });
      await throwUnlessSuccessful(response, 'place clip');
      return response.json();
    },
    onMutate: async ({ songId, ...clip }) =>
      await writeSketch(queryClient, songId, (sketch) => settleClipInSketch(sketch, clip)),
    onSuccess: (data, variables) => {
      refreshSketchCounts(queryClient);
      if (!('clip' in data)) return;
      settleSketch(queryClient, variables.songId, (sketch) =>
        settleClipInSketch(sketch, data.clip),
      );
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.songId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useMoveSketchClip() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ songId, clipId, laneId, offsetSeconds }: ClipMoveVariables) => {
      const response = await api.api.sketches[':songId'].clips[':clipId'].$patch({
        param: { songId, clipId },
        json: { laneId, offsetSeconds },
      });
      await throwUnlessSuccessful(response, 'move clip');
      return response.json();
    },
    onMutate: async ({ songId, ...move }) =>
      await writeSketch(queryClient, songId, (sketch) => moveClipInSketch(sketch, move)),
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.songId, context, error);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRemoveSketchClip() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SKETCH_WRITE_SCOPE,
    mutationKey: sketchKeys.all,
    mutationFn: async ({ songId, clipId }: ClipRemoval) => {
      const response = await api.api.sketches[':songId'].clips[':clipId'].$delete({
        param: { songId, clipId },
      });
      await throwUnlessSuccessful(response, 'remove clip');
      return response.json();
    },
    onMutate: async (variables) =>
      await writeSketch(queryClient, variables.songId, (sketch) =>
        removeClipFromSketch(sketch, variables.clipId),
      ),
    onSuccess: () => {
      refreshSketchCounts(queryClient);
    },
    onError: (error, variables, context) => {
      restoreSketch(queryClient, variables.songId, context, error);
    },
  });
}
