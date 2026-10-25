/** @Feature takes */

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import type { QueuedTake, SignedTakeUpload, TakeCreateBody } from '../take-queue.core';
import type { TakeTransportResult } from '../take-queue.store';
import {
  appendCommentOnce,
  insertTakeNewestFirst,
  removeCommentById,
  removeTakeById,
  shiftCommentCount,
} from './takes.utils';
import { useSignedChartUrl } from './uploads.queries';

export const takeKeys = {
  all: ['takes'] as const,
  ofSong: (songId: string) => [...takeKeys.all, 'ofSong', songId] as const,
  commentsOf: (takeId: string) => [...takeKeys.all, 'comments', takeId] as const,
};

type TakesOfSongResponse = InferResponseType<typeof api.api.takes.$get, 200>;
export type ListedTake = TakesOfSongResponse['takes'][number];
type TakeCommentsResponse = InferResponseType<
  (typeof api.api.takes)[':id']['comments']['$get'],
  200
>;
type TakeCommentCreateBody = Parameters<
  (typeof api.api.takes)[':id']['comments']['$post']
>[0]['json'];

// @FollowsBlueprint query-module
export function useTakesOfSong(songId: string, isEnabled = true) {
  return useQuery({
    queryKey: takeKeys.ofSong(songId),
    queryFn: async () => {
      const response = await api.api.takes.$get({ query: { songId } });
      if (!response.ok) throw new ApiError(response.status, `takes ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

export function useTakePlaybackUrl(objectKey: string | null) {
  return useSignedChartUrl(objectKey);
}

export function useTakeComments(takeId: string | null) {
  return useQuery({
    queryKey: takeKeys.commentsOf(takeId ?? ''),
    queryFn: async () => {
      const response = await api.api.takes[':id'].comments.$get({ param: { id: takeId ?? '' } });
      if (!response.ok) throw new ApiError(response.status, `comments ${response.status}`, null);
      return response.json();
    },
    enabled: takeId !== null,
  });
}

const NETWORK_FAILURE: TakeTransportResult<never> = { kind: 'failed', status: null };

export async function signTakeUpload(
  take: QueuedTake,
): Promise<TakeTransportResult<SignedTakeUpload>> {
  try {
    const response = await api.api.takes.sign.$post({
      json: {
        takeId: take.id,
        songId: take.songId,
        contentType: take.contentType,
        contentLength: take.byteLength,
      },
    });
    if (!response.ok) return { kind: 'failed', status: response.status };
    const body = await response.json();
    if (!('uploadUrl' in body)) return { kind: 'failed', status: response.status };
    return {
      kind: 'ok',
      value: { uploadUrl: body.uploadUrl, objectKey: body.objectKey, expiresAt: body.expiresAt },
    };
  } catch {
    return NETWORK_FAILURE;
  }
}

export async function createTakeRecord(
  body: TakeCreateBody,
): Promise<TakeTransportResult<ListedTake>> {
  try {
    const response = await api.api.takes.$post({ json: body });
    if (!isResponseSuccessful(response)) return { kind: 'failed', status: response.status };
    const created = await response.json();
    return { kind: 'ok', value: created.take };
  } catch {
    return NETWORK_FAILURE;
  }
}

// @FollowsBlueprint query-settled-from-the-write-response
export function writeCreatedTake(queryClient: QueryClient, take: ListedTake): void {
  queryClient.setQueryData<TakesOfSongResponse>(takeKeys.ofSong(take.songId), (cache) => {
    if (cache === undefined) return cache;
    return { takes: insertTakeNewestFirst(cache.takes, take) };
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteTake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: takeKeys.all,
    mutationFn: async (variables: { readonly takeId: string; readonly songId: string }) => {
      const response = await api.api.takes[':id'].$delete({ param: { id: variables.takeId } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = takeKeys.ofSong(variables.songId);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<TakesOfSongResponse>(listKey);
      queryClient.setQueryData<TakesOfSongResponse>(listKey, (cache) => {
        if (cache === undefined) return cache;
        return { takes: removeTakeById(cache.takes, variables.takeId) };
      });
      return { previous };
    },
    onError: (_error, variables, context) => {
      if (context?.previous === undefined) return;
      queryClient.setQueryData(takeKeys.ofSong(variables.songId), context.previous);
    },
  });
}

function shiftCommentCountInCache(
  queryClient: QueryClient,
  songId: string,
  takeId: string,
  delta: number,
): void {
  queryClient.setQueryData<TakesOfSongResponse>(takeKeys.ofSong(songId), (cache) => {
    if (cache === undefined) return cache;
    return { takes: shiftCommentCount(cache.takes, takeId, delta) };
  });
}

interface TakeCommentTarget {
  readonly takeId: string;
  readonly songId: string;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useCreateTakeComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: takeKeys.all,
    mutationFn: async (variables: TakeCommentTarget & TakeCommentCreateBody) => {
      const { takeId, songId: _songId, ...json } = variables;
      const response = await api.api.takes[':id'].comments.$post({ param: { id: takeId }, json });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `comment ${response.status}`, null);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<TakeCommentsResponse>(
        takeKeys.commentsOf(variables.takeId),
        (cache) => {
          if (cache === undefined) return cache;
          return { comments: appendCommentOnce(cache.comments, data.comment) };
        },
      );
      shiftCommentCountInCache(queryClient, variables.songId, variables.takeId, 1);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteTakeComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: takeKeys.all,
    mutationFn: async (variables: TakeCommentTarget & { readonly commentId: string }) => {
      const response = await api.api.takes[':id'].comments[':commentId'].$delete({
        param: { id: variables.takeId, commentId: variables.commentId },
      });
      if (!response.ok) throw new ApiError(response.status, `uncomment ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const commentsKey = takeKeys.commentsOf(variables.takeId);
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previous = queryClient.getQueryData<TakeCommentsResponse>(commentsKey);
      queryClient.setQueryData<TakeCommentsResponse>(commentsKey, (cache) => {
        if (cache === undefined) return cache;
        return { comments: removeCommentById(cache.comments, variables.commentId) };
      });
      shiftCommentCountInCache(queryClient, variables.songId, variables.takeId, -1);
      return { previous };
    },
    onError: (_error, variables, context) => {
      if (context?.previous === undefined) return;
      queryClient.setQueryData(takeKeys.commentsOf(variables.takeId), context.previous);
      shiftCommentCountInCache(queryClient, variables.songId, variables.takeId, 1);
    },
  });
}
