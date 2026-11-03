/** @Feature setlists */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  recountSongsBefore,
  withdrawSongFromBreaks,
} from '../../components/organisms/setlist-breaks.utils';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { setlistKeys } from './setlists.queries';

const BREAK_WRITE_SCOPE = { id: 'setlist-entry-writes' } as const;

async function fetchSetlistBreaks(setlistId: string) {
  const response = await api.api.setlists[':id'].breaks.$get({ param: { id: setlistId } });
  if (!response.ok) throw new ApiError(response.status, `breaks ${response.status}`, null);
  return response.json();
}

type BreaksCache = Awaited<ReturnType<typeof fetchSetlistBreaks>>;

export type SetlistBreak = BreaksCache['breaks'][number];

// @FollowsBlueprint query-module
export function useSetlistBreaks(setlistId: string) {
  return useQuery({
    queryKey: setlistKeys.breaksOf(setlistId),
    queryFn: () => fetchSetlistBreaks(setlistId),
  });
}

function useSettleBreaksFromResponse() {
  const queryClient = useQueryClient();
  return (data: BreaksCache, variables: { readonly setlistId: string }): void => {
    queryClient.setQueryData<BreaksCache>(setlistKeys.breaksOf(variables.setlistId), {
      breaks: data.breaks,
    });
  };
}

// @FollowsBlueprint query-pessimistic-mutation
export function useInsertSetlistBreak() {
  return useMutation({
    scope: BREAK_WRITE_SCOPE,
    mutationFn: async (variables: { setlistId: string; afterEntryId: string }) => {
      const response = await api.api.setlists[':id'].breaks.$post({
        param: { id: variables.setlistId },
        json: { afterEntryId: variables.afterEntryId, label: '' },
      });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `break ${response.status}`, null);
      return await response.json();
    },
    onSuccess: useSettleBreaksFromResponse(),
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useRenameSetlistBreak() {
  return useMutation({
    scope: BREAK_WRITE_SCOPE,
    mutationFn: async (variables: { setlistId: string; breakId: string; label: string }) => {
      const response = await api.api.setlists[':id'].breaks[':breakId'].$put({
        param: { id: variables.setlistId, breakId: variables.breakId },
        json: { label: variables.label },
      });
      if (!response.ok) throw new ApiError(response.status, `rename ${response.status}`, null);
      return await response.json();
    },
    onSuccess: useSettleBreaksFromResponse(),
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useDeleteSetlistBreak() {
  return useMutation({
    scope: BREAK_WRITE_SCOPE,
    mutationFn: async (variables: { setlistId: string; breakId: string }) => {
      const response = await api.api.setlists[':id'].breaks[':breakId'].$delete({
        param: { id: variables.setlistId, breakId: variables.breakId },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return await response.json();
    },
    onSuccess: useSettleBreaksFromResponse(),
  });
}

type FailureHandler = () => void;

export interface BreaksFollowingEntries {
  readonly followReorder: (
    setlistId: string,
    orderedIds: readonly string[],
    onFailure: FailureHandler,
  ) => FailureHandler;
  readonly withdrawSong: (
    setlistId: string,
    songIndex: number,
    onFailure: FailureHandler,
  ) => FailureHandler;
}

export function useBreaksFollowingEntries(): BreaksFollowingEntries {
  const queryClient = useQueryClient();
  const rewrite = (
    setlistId: string,
    move: (breaks: readonly SetlistBreak[]) => SetlistBreak[],
    onFailure: FailureHandler,
  ): FailureHandler => {
    const key = setlistKeys.breaksOf(setlistId);
    const previous = queryClient.getQueryData<BreaksCache>(key);
    if (previous === undefined) return onFailure;
    queryClient.setQueryData<BreaksCache>(key, { breaks: move(previous.breaks) });
    return () => {
      queryClient.setQueryData<BreaksCache>(key, previous);
      onFailure();
    };
  };
  return {
    followReorder: (setlistId, orderedIds, onFailure) =>
      rewrite(setlistId, (breaks) => recountSongsBefore(breaks, orderedIds), onFailure),
    withdrawSong: (setlistId, songIndex, onFailure) =>
      rewrite(setlistId, (breaks) => withdrawSongFromBreaks(breaks, songIndex), onFailure),
  };
}
