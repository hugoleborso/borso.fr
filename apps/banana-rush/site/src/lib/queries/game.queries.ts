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
  rounds: (joinCode: string) => [...gameKeys.all, joinCode, 'rounds'] as const,
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
 * @Blueprint query-read-only-what-the-screen-that-asks-needs
 * @BlueprintName Query Fetching What A Broadcast Deliberately Leaves Out
 * @BlueprintUsage Use for a record that grows without bound and that one screen out of several reads, when the live payload already reaches every reader.
 * @BlueprintDescription Reads the history through its own key and its own request, mounted with the screen that shows it, rather than being carried on the record that is pushed to every phone after every round. The live payload is broadcast, so a field added to it is paid for by every reader on every push, while this one is paid for only by the reader who asked. The rounds already resolved never change, so nothing invalidates this key and a reader that comes back to the screen is served from the cache.
 */
export function useGameRounds(joinCode: string) {
  return useQuery({
    queryKey: gameKeys.rounds(joinCode),
    queryFn: async () => {
      const response = await api.api.games[':code'].rounds.$get({ param: { code: joinCode } });
      if (!response.ok) return await refuse(response);
      const body = await response.json();
      return body.rounds;
    },
    enabled: joinCode.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
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

export function useRematch(joinCode: string, token: string) {
  return useGameWrite(joinCode, async () => {
    const response = await api.api.games[':code'].rematch.$post(
      { param: { code: joinCode } },
      { headers: authorized(token) },
    );
    if (!response.ok) return await refuse(response);
    const body = await response.json();
    return body.game;
  });
}

/**
 * @Blueprint query-claiming-a-seat-nobody-else-may-take
 * @BlueprintName Query Claiming A Seat With The Credential Of The Last One
 * @BlueprintUsage Use where a group moves together to a new record and each member has to be handed a credential of their own without any of them reaching another member.
 * @BlueprintDescription Sends the credential this phone already holds and receives the one for the new record, so the announcement that moved the group carries no secret at all and every phone ends up with exactly its own. The new seat is written into the cache under the new key before anything navigates there, which is what lets the screen that opens next render the table rather than a spinner, and the seat is saved to storage first, so a phone that is closed on the way still finds its monkey when it comes back.
 */
export function useClaimRematchSeat(joinCode: string, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.api.games[':code'].seat.$post(
        { param: { code: joinCode } },
        { headers: authorized(token) },
      );
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
