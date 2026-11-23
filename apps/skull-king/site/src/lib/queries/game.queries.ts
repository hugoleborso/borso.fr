/** @Feature game */

import type { RoundPhase } from '@domain/round.core';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api.client';
import { readFailureCode } from '../api-failure.core';
import {
  addPendingEdit,
  dropPendingEdit,
  type GameCache,
  type PendingEdit,
  readShownGame,
  receiveGame,
  selectShownGame,
} from '../game-cache.core';
import type { EntryEdit, GameEdit, PlayerEdit, RoundEdit } from '../game-edits.core';
import { selectLatestEntry } from '../game-scores.core';
import type { GameEntry, GameView } from '../game-view.core';
import { type RosterPlayer, selectSeatsToCreate } from '../roster.core';

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
  queryClient.setQueryData<GameCache>(gameKeys.detail(game.joinCode), (cache) =>
    receiveGame(cache, game),
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
  const queryClient = useQueryClient();
  const key = gameKeys.detail(joinCode);
  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<GameCache> => {
      const response = await api.api.games[':code'].$get({ param: { code: joinCode } });
      const fetched = await readGame(response);
      return receiveGame(queryClient.getQueryData<GameCache>(key), fetched);
    },
    select: selectShownGame,
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
      const players = selectSeatsToCreate(table.players, table.isFirstSeatMine);
      return await readGame(await api.api.games.$post({ json: { players: [...players] } }));
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
 * @BlueprintName Query Optimistic Write Laid Over The Newest Server View
 * @BlueprintUsage Use for a write that a broadcast of the whole record also reaches, where every tap has to show at once and several phones write the same record.
 * @BlueprintDescription Records the edit as pending in `onMutate` beside the server's view rather than writing a prediction over it, so a broadcast from another phone that lands meanwhile still replaces the server's view and the screen shows both. The answer goes through the same newest-wins rule as every broadcast and read, and the edit leaves the pending list once the write settles, whether it succeeded or failed, so a refused write vanishes from the screen without any snapshot to restore.
 */
export function useOptimisticGameWrite<TVariables>(
  joinCode: string,
  describeEdit: (variables: TVariables) => GameEdit,
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
      const pending: PendingEdit = { edit: describeEdit(variables) };
      queryClient.setQueryData<GameCache>(key, (cache) => addPendingEdit(cache, pending));
      return { pending };
    },
    onSuccess: (game) => {
      settleGame(queryClient, game);
    },
    onSettled: (_game, _failure, _variables, context) => {
      const pending = context?.pending;
      if (pending === undefined) return;
      queryClient.setQueryData<GameCache>(key, (cache) => dropPendingEdit(cache, pending));
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
    (write: EntryWrite) => ({
      kind: 'entry',
      roundNumber: write.roundNumber,
      playerId: write.playerId,
      edit: write.edit,
    }),
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
    (write: RoundWrite) => ({ kind: 'round', roundNumber: write.roundNumber, edit: write.edit }),
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
    (move: PhaseMove) => ({ kind: 'phase', round: move.round, phase: move.phase }),
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
    (change: PlayerChange) => ({ kind: 'player', playerId: change.playerId, edit: change.edit }),
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
      readShownGame(queryClient.getQueryData<GameCache>(gameKeys.detail(joinCode))),
      roundNumber,
      playerId,
    );
}
