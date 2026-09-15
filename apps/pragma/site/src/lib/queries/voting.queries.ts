/** @Feature setlist-voting */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';
import { applyScoreToBoard, type VoteBoard } from './voting.utils';

export const votingKeys = {
  all: ['voting'] as const,
  board: (setlistId: string) => [...votingKeys.all, 'board', setlistId] as const,
  proposal: (setlistId: string) => [...votingKeys.all, 'proposal', setlistId] as const,
};

async function throwOnFailure(response: Response, label: string) {
  if (response.ok) return;
  const failureBody: unknown = await response.json().catch(() => null);
  throw new ApiError(response.status, `${label} ${String(response.status)}`, failureBody);
}

const BOARD_REFRESH_MS = 15_000;

// @FollowsBlueprint query-polling
export function useVoteBoard(setlistId: string) {
  return useQuery({
    queryKey: votingKeys.board(setlistId),
    refetchInterval: BOARD_REFRESH_MS,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<VoteBoard> => {
      const response = await api.api.setlists[':id'].votes.$get({ param: { id: setlistId } });
      await throwOnFailure(response, 'vote-board');
      const body = await response.json();
      if (!('status' in body)) throw new ApiError(response.status, 'vote-board shape', body);
      return body;
    },
  });
}

export interface ScoreVariables {
  readonly songId: string;
  readonly points: number;
}

// @FollowsBlueprint query-optimistic-mutation
export function useScoreSong(setlistId: string, memberId: string) {
  const queryClient = useQueryClient();
  const boardKey = votingKeys.board(setlistId);
  return useMutation({
    mutationFn: async (variables: ScoreVariables) => {
      const response = await api.api.setlists[':id'].votes[':songId'].$put({
        param: { id: setlistId, songId: variables.songId },
        json: { points: variables.points },
      });
      await throwOnFailure(response, 'score');
      return await response.json();
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const snapshot = queryClient.getQueryData<VoteBoard>(boardKey);
      if (snapshot !== undefined) {
        queryClient.setQueryData<VoteBoard>(
          boardKey,
          applyScoreToBoard(snapshot, memberId, variables.songId, variables.points),
        );
      }
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData<VoteBoard>(boardKey, context.snapshot);
      }
    },
    onSuccess: (confirmed) => {
      const current = queryClient.getQueryData<VoteBoard>(boardKey);
      if (current === undefined || !('budget' in confirmed)) return;
      queryClient.setQueryData<VoteBoard>(boardKey, { ...current, budget: confirmed.budget });
    },
  });
}

export function useClosingProposal(setlistId: string, isEnabled: boolean) {
  return useQuery({
    queryKey: votingKeys.proposal(setlistId),
    enabled: isEnabled,
    queryFn: async () => {
      const response = await api.api.setlists[':id']['closing-proposal'].$get({
        param: { id: setlistId },
      });
      await throwOnFailure(response, 'closing-proposal');
      const body = await response.json();
      return 'tallies' in body ? body.tallies : [];
    },
  });
}

export function useSetVoteStatus(setlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      status: 'voting' | 'locked';
      targetSongCount: number | null;
    }) => {
      const response = await api.api.setlists[':id']['vote-status'].$put({
        param: { id: setlistId },
        json: variables,
      });
      await throwOnFailure(response, 'vote-status');
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: votingKeys.board(setlistId) });
    },
  });
}

export function useCloseVote(setlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { songIds: readonly string[] }) => {
      const response = await api.api.setlists[':id'].close.$post({
        param: { id: setlistId },
        json: { songIds: [...variables.songIds] },
      });
      await throwOnFailure(response, 'close');
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: votingKeys.all });
    },
  });
}
