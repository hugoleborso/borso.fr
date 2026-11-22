/** @Feature account */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api.client';
import { readFailureCode } from '../api-failure.core';
import { startPasskeyEnrolment, startPasskeyLogin } from '../passkey.adapter';
import type { RosterPlayer } from '../roster.core';
import { useOptimisticGameWrite } from './game.queries';

export const accountKeys = {
  all: ['account'] as const,
  me: () => [...accountKeys.all, 'me'] as const,
  games: () => [...accountKeys.all, 'games'] as const,
};

interface Answer {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

async function refuseUnless(response: Answer): Promise<void> {
  if (response.ok) return;
  const body: unknown = await response.json().catch(() => null);
  throw new ApiError(response.status, readFailureCode(body));
}

// @FollowsBlueprint query-module
export function useMe() {
  return useQuery({
    queryKey: accountKeys.me(),
    queryFn: async () => {
      const response = await api.api.accounts.me.$get();
      await refuseUnless(response);
      const body = await response.json();
      return body.account;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useMyGames(isSignedIn: boolean) {
  return useQuery({
    queryKey: accountKeys.games(),
    queryFn: async () => {
      const response = await api.api.accounts.me.games.$get();
      await refuseUnless(response);
      const body = await response.json();
      return body.games;
    },
    enabled: isSignedIn,
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mark: RosterPlayer) => {
      const optionsResponse = await api.api.accounts.registration.options.$post({
        json: { name: mark.name },
      });
      await refuseUnless(optionsResponse);
      const { options } = await optionsResponse.json();
      const attestation = await startPasskeyEnrolment(options);
      const response = await api.api.accounts.registration.$post({
        json: { name: mark.name, icon: mark.icon, color: mark.color, response: attestation },
      });
      await refuseUnless(response);
      const body = await response.json();
      return body.account;
    },
    onSuccess: (account) => {
      queryClient.setQueryData(accountKeys.me(), account);
      void queryClient.invalidateQueries({ queryKey: accountKeys.games() });
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const optionsResponse = await api.api.accounts['sign-in'].options.$post();
      await refuseUnless(optionsResponse);
      const { options } = await optionsResponse.json();
      const assertion = await startPasskeyLogin(options);
      const response = await api.api.accounts['sign-in'].$post({ json: { response: assertion } });
      await refuseUnless(response);
      const body = await response.json();
      return body.account;
    },
    onSuccess: (account) => {
      queryClient.setQueryData(accountKeys.me(), account);
      void queryClient.invalidateQueries({ queryKey: accountKeys.games() });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.api.accounts['sign-out'].$post();
      await refuseUnless(response);
    },
    onSuccess: () => {
      queryClient.setQueryData(accountKeys.me(), null);
      queryClient.removeQueries({ queryKey: accountKeys.games() });
    },
  });
}

export interface SeatClaim {
  readonly playerId: string;
  readonly accountId: string;
}

// @FollowsBlueprint query-optimistic-write-guarded-by-read-time
export function useClaimSeat(joinCode: string) {
  return useOptimisticGameWrite(
    joinCode,
    (claim: SeatClaim) => ({ kind: 'seat', playerId: claim.playerId, accountId: claim.accountId }),
    async (claim) => {
      const response = await api.api.games[':code'].players[':playerId'].claim.$post({
        param: { code: joinCode, playerId: claim.playerId },
      });
      await refuseUnless(response);
      const body = await response.json();
      return body.game;
    },
  );
}
