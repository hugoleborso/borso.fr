/** @Feature game */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api.client';
import { readFailureCode } from '../api-failure.core';
import type { BroadcastGame } from '../game-broadcast.core';
import { saveSeat } from '../player-session.store';

function authorized(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export const gameKeys = {
  all: ['game'] as const,
  detail: (joinCode: string) => [...gameKeys.all, joinCode] as const,
  config: ['config'] as const,
};

type CreateGameBody = Parameters<typeof api.api.games.$post>[0]['json'];
type JoinGameBody = Parameters<(typeof api.api.games)[':code']['players']['$post']>[0]['json'];

async function refuse(response: Response): Promise<never> {
  const body: unknown = await response.json().catch(() => null);
  throw new ApiError(response.status, readFailureCode(body));
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

export function useGame(joinCode: string, token: string | null) {
  return useQuery({
    queryKey: gameKeys.detail(joinCode),
    queryFn: async (): Promise<BroadcastGame> => {
      const response = await api.api.games[':code'].$get(
        { param: { code: joinCode } },
        { headers: token === null ? {} : authorized(token) },
      );
      if (!response.ok) return await refuse(response);
      const body = await response.json();
      return body.game;
    },
    enabled: joinCode.length > 0,
  });
}

/**
 * @Blueprint query-settled-from-the-write-response
 * @BlueprintName Query Settled From The Write Response
 * @BlueprintUsage Use for a write whose response already carries the whole record the screen shows.
 * @BlueprintDescription Writes the response straight into the cache and never invalidates, because a second read would ask a different connection for a row this one has just committed and can be answered from before the commit. There is no optimistic overlay either: the interesting part of this write is decided by the server reading everybody else's move, so guessing it locally would show a number that is about to change. The broadcast that follows reaches every other reader through the same cache key, which is why one shape settles both paths.
 */
function useGameWrite<TVariables>(
  joinCode: string,
  send: (variables: TVariables) => Promise<BroadcastGame>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (game) => {
      queryClient.setQueryData(gameKeys.detail(joinCode), game);
    },
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateGameBody) => {
      const response = await api.api.games.$post({ json: body });
      if (!response.ok) return await refuse(response);
      return await response.json();
    },
    onSuccess: (seated) => {
      saveSeat(seated.game.joinCode, {
        playerId: seated.playerId,
        playerToken: seated.playerToken,
      });
      queryClient.setQueryData(gameKeys.detail(seated.game.joinCode), seated.game);
    },
  });
}

export function useJoinGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { joinCode: string; body: JoinGameBody }) => {
      const response = await api.api.games[':code'].players.$post({
        param: { code: variables.joinCode },
        json: variables.body,
      });
      if (!response.ok) return await refuse(response);
      return await response.json();
    },
    onSuccess: (seated) => {
      saveSeat(seated.game.joinCode, {
        playerId: seated.playerId,
        playerToken: seated.playerToken,
      });
      queryClient.setQueryData(gameKeys.detail(seated.game.joinCode), seated.game);
    },
  });
}

export function useStartGame(joinCode: string, token: string) {
  return useGameWrite(joinCode, async () => {
    const response = await api.api.games[':code'].start.$post(
      { param: { code: joinCode } },
      { headers: authorized(token) },
    );
    if (!response.ok) return await refuse(response);
    const body = await response.json();
    return body.game;
  });
}

export function usePlaceBid(joinCode: string, token: string) {
  return useGameWrite(joinCode, async (amount: number) => {
    const response = await api.api.games[':code'].bids.$post(
      { param: { code: joinCode }, json: { amount } },
      { headers: authorized(token) },
    );
    if (!response.ok) return await refuse(response);
    const body = await response.json();
    return body.game;
  });
}

export function useResolveRound(joinCode: string, token: string) {
  return useGameWrite(joinCode, async () => {
    const response = await api.api.games[':code'].resolve.$post(
      { param: { code: joinCode } },
      { headers: authorized(token) },
    );
    if (!response.ok) return await refuse(response);
    const body = await response.json();
    return body.game;
  });
}
