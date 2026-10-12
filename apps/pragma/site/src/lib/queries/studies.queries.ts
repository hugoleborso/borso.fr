/** @Feature studies */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api } from '../api.client';
import { markStudied, settleOwnStreak } from './studies.utils';

export const studyKeys = {
  all: ['studies'] as const,
  overview: () => [...studyKeys.all, 'overview'] as const,
  historyOf: (songId: string) => [...studyKeys.all, 'history', songId] as const,
  overridesOf: (songId: string) => [...studyKeys.all, 'overrides', songId] as const,
};

const CREATED_STATUS = 201;
const OK_STATUS = 200;

export type StudiesOverview = InferResponseType<typeof api.api.studies.overview.$get, 200>;
export type StudyQueueRow = StudiesOverview['queue'][number];

interface StudyTarget {
  readonly songId: string;
  readonly instrumentId: string;
}

interface ScoreVariables extends StudyTarget {
  readonly memberId: string;
  readonly score: number;
}

// @FollowsBlueprint query-module
export function useStudiesOverview() {
  return useQuery({
    queryKey: studyKeys.overview(),
    queryFn: async () => {
      const response = await api.api.studies.overview.$get();
      if (!response.ok) throw new ApiError(response.status, `studies ${response.status}`, null);
      return response.json();
    },
  });
}

export function useScoreHistoryOfSong(songId: string) {
  return useQuery({
    queryKey: studyKeys.historyOf(songId),
    queryFn: async () => {
      const response = await api.api.mastery.history[':songId'].$get({ param: { songId } });
      if (!response.ok) throw new ApiError(response.status, `history ${response.status}`, null);
      return response.json();
    },
  });
}

export function useMasteryOverridesOfSong(songId: string, isEnabled = true) {
  return useQuery({
    queryKey: studyKeys.overridesOf(songId),
    queryFn: async () => {
      const response = await api.api.mastery.overrides[':songId'].$get({ param: { songId } });
      if (!response.ok) throw new ApiError(response.status, `overrides ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

function useStudyToggle(isStudiedToday: boolean) {
  const queryClient = useQueryClient();
  return {
    queryClient,
    onMutate: async (target: StudyTarget) => {
      const key = studyKeys.overview();
      await queryClient.cancelQueries({ queryKey: key });
      const previousOverview = queryClient.getQueryData<StudiesOverview>(key);
      queryClient.setQueryData<StudiesOverview>(key, (old) =>
        old === undefined ? old : markStudied(old, target, isStudiedToday),
      );
      return { previousOverview };
    },
    onError: (
      _error: unknown,
      _target: StudyTarget,
      context: { previousOverview: StudiesOverview | undefined } | undefined,
    ) => {
      if (context?.previousOverview !== undefined) {
        queryClient.setQueryData(studyKeys.overview(), context.previousOverview);
      }
    },
  };
}

// @FollowsBlueprint query-optimistic-mutation
export function useLogStudy(memberId: string) {
  const toggle = useStudyToggle(true);
  return useMutation({
    mutationKey: studyKeys.all,
    mutationFn: async (target: StudyTarget) => {
      const response = await api.api.studies.$post({ json: target });
      if (response.status !== CREATED_STATUS)
        throw new ApiError(response.status, `study ${response.status}`, null);
      return await response.json();
    },
    onMutate: toggle.onMutate,
    onError: toggle.onError,
    onSuccess: (data) => {
      toggle.queryClient.setQueryData<StudiesOverview>(studyKeys.overview(), (old) =>
        old === undefined ? old : settleOwnStreak(old, memberId, data.myStreak),
      );
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUndoStudy(memberId: string) {
  const toggle = useStudyToggle(false);
  return useMutation({
    mutationKey: studyKeys.all,
    mutationFn: async (target: StudyTarget) => {
      const response = await api.api.studies[':songId'][':instrumentId'].$delete({ param: target });
      if (response.status !== OK_STATUS)
        throw new ApiError(response.status, `undo ${response.status}`, null);
      return await response.json();
    },
    onMutate: toggle.onMutate,
    onError: toggle.onError,
    onSuccess: (data) => {
      toggle.queryClient.setQueryData<StudiesOverview>(studyKeys.overview(), (old) =>
        old === undefined ? old : settleOwnStreak(old, memberId, data.myStreak),
      );
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useSaveSongScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: studyKeys.all,
    mutationFn: async (variables: ScoreVariables) => {
      const response = await api.api.mastery.overrides.$put({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `score ${response.status}`, null);
      return await response.json();
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studyKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: studyKeys.historyOf(variables.songId) }),
        queryClient.invalidateQueries({ queryKey: studyKeys.overridesOf(variables.songId) }),
      ]);
    },
  });
}
