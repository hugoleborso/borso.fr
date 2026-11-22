/** @Feature game */

import type { RoundPhase } from '@domain/round.core';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api.client';
import { readFailureCode } from '../api-failure.core';
import {
  applyEntryEdit,
  applyPhaseEdit,
  applyPlayerEdit,
  applyRoundEdit,
  type EntryEdit,
  type PlayerEdit,
  type RoundEdit,
} from '../game-edits.core';
import { selectLatestEntry } from '../game-scores.core';
import {
  type GameEntry,
  type GameView,
  isLastPendingWrite,
  selectNewerGame,
} from '../game-view.core';
import type { RosterPlayer } from '../roster.core';

export const gameKeys = {
  all: ['game'] as const,
  detail: (joinCode: string) => [...gameKeys.all, joinCode] as const,
  config: ['config'] as const,
  writes: (joinCode: string) => [...gameKeys.all, joinCode, 'write'] as const,
};

interface GameAnswer {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<{ readonly game: GameView }>;
}

async function readGame(response: GameAnswer): Promise<GameView> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, readFailureCode(body));
  }
  const body = await response.json();
  return body.game;
}

export function settleGame(queryClient: QueryClient, game: GameView): void {
  queryClient.setQueryData<GameView>(gameKeys.detail(game.joinCode), (cached) =>
    selectNewerGame(cached, game),
  );
}

export function useConfig() {
  return useQuery({
    queryKey: gameKeys.config,
    queryFn: async () => {
      const response = await api.api.config.$get();
      if (!response.ok) return { websocketUrl: null };
      return await response.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// @FollowsBlueprint query-module
export function useGame(joinCode: string) {
  return useQuery({
    queryKey: gameKeys.detail(joinCode),
    queryFn: async (): Promise<GameView> => {
      const response = await api.api.games[':code'].$get({ param: { code: joinCode } });
      return await readGame(response);
    },
    enabled: joinCode.length > 0,
  });
}

// @FollowsBlueprint query-settled-from-the-write-response
export interface TableToSeat {
  readonly players: readonly RosterPlayer[];
  readonly isFirstSeatMine: boolean;
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (table: TableToSeat): Promise<GameView> => {
      const created = await readGame(
        await api.api.games.$post({ json: { players: [...table.players] } }),
      );
      const firstSeat = created.players[0];
      if (!table.isFirstSeatMine || firstSeat === undefined) return created;
      return await readGame(
        await api.api.games[':code'].players[':playerId'].claim.$post({
          param: { code: created.joinCode, playerId: firstSeat.id },
        }),
      );
    },
    onSuccess: (game) => {
      settleGame(queryClient, game);
    },
  });
}

export function useRematch(joinCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<GameView> => {
      const response = await api.api.games[':code'].rematch.$post({ param: { code: joinCode } });
      return await readGame(response);
    },
    onSuccess: (game) => {
      settleGame(queryClient, game);
    },
  });
}

/**
 * @Blueprint query-optimistic-write-guarded-by-read-time
 * @BlueprintName Query Optimistic Write Guarded By Read Time
 * @BlueprintUsage Use for a write that a broadcast of the whole record also reaches, where every tap has to show at once and several phones write the same record.
 * @BlueprintDescription Predicts the view from the request in `onMutate` and settles from the answer, never from a second read, and writes the answer only when its `readAt` is not older than the cached view, so the answer to an early tap cannot undo a broadcast that already carried a later one. A failure restores the snapshot only when nothing newer has reached the cache since, because a broadcast that arrived in the meantime is the truth and the snapshot is not.
 */
function useOptimisticGameWrite<TVariables>(
  joinCode: string,
  predict: (game: GameView, variables: TVariables) => GameView,
  send: (variables: TVariables) => Promise<GameView>,
) {
  const queryClient = useQueryClient();
  const key = gameKeys.detail(joinCode);
  return useMutation({
    mutationFn: send,
    mutationKey: gameKeys.writes(joinCode),
    scope: { id: `game-${joinCode}` },
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<GameView>(key);
      if (snapshot !== undefined) queryClient.setQueryData(key, predict(snapshot, variables));
      return { snapshot };
    },
    onError: (_failure, _variables, context) => {
      const snapshot = context?.snapshot;
      if (snapshot === undefined) return;
      queryClient.setQueryData<GameView>(key, (cached) =>
        cached === undefined || cached.readAt === snapshot.readAt ? snapshot : cached,
      );
    },
    onSuccess: (game) => {
      const isLast = isLastPendingWrite(
        queryClient.isMutating({ mutationKey: gameKeys.writes(joinCode) }),
      );
      if (isLast) settleGame(queryClient, game);
    },
  });
}

export interface EntryWrite {
  readonly roundNumber: number;
  readonly playerId: string;
  readonly edit: EntryEdit;
}

export function useWriteEntry(joinCode: string) {
  return useOptimisticGameWrite(
    joinCode,
    (game, write: EntryWrite) =>
      applyEntryEdit(game, write.roundNumber, write.playerId, write.edit),
    async (write) => {
      const response = await api.api.games[':code'].rounds[':round'].entries[':playerId'].$put({
        param: { code: joinCode, round: String(write.roundNumber), playerId: write.playerId },
        json: { ...write.edit },
      });
      return await readGame(response);
    },
  );
}

export interface RoundWrite {
  readonly roundNumber: number;
  readonly edit: RoundEdit;
}

export function useWriteRound(joinCode: string) {
  return useOptimisticGameWrite(
    joinCode,
    (game, write: RoundWrite) => applyRoundEdit(game, write.roundNumber, write.edit),
    async (write) => {
      const response = await api.api.games[':code'].rounds[':round'].$put({
        param: { code: joinCode, round: String(write.roundNumber) },
        json: { ...write.edit },
      });
      return await readGame(response);
    },
  );
}

export interface PhaseMove {
  readonly round: number;
  readonly phase: RoundPhase;
}

export function useMovePhase(joinCode: string) {
  return useOptimisticGameWrite(
    joinCode,
    (game, move: PhaseMove) => applyPhaseEdit(game, move.round, move.phase),
    async (move) => {
      const response = await api.api.games[':code'].phase.$put({
        param: { code: joinCode },
        json: { round: move.round, phase: move.phase },
      });
      return await readGame(response);
    },
  );
}

export interface PlayerChange {
  readonly playerId: string;
  readonly edit: PlayerEdit;
}

export function useChangePlayer(joinCode: string) {
  return useOptimisticGameWrite(
    joinCode,
    (game, change: PlayerChange) => applyPlayerEdit(game, change.playerId, change.edit),
    async (change) => {
      const response = await api.api.games[':code'].players[':playerId'].$patch({
        param: { code: joinCode, playerId: change.playerId },
        json: { ...change.edit },
      });
      return await readGame(response);
    },
  );
}

export function useReadLatestEntry(joinCode: string) {
  const queryClient = useQueryClient();
  return (roundNumber: number, playerId: string): GameEntry | null =>
    selectLatestEntry(
      queryClient.getQueryData<GameView>(gameKeys.detail(joinCode)),
      roundNumber,
      playerId,
    );
}
