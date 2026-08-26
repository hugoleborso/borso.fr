/** @Feature audience-voting */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { readBallotToken, writeBallotToken } from '../ballot-token.adapter';
import {
  addSuggestedSongToPool,
  applyVoteToState,
  type ConcertStateCache,
  type RoundHistoryCache,
  selectPollInterval,
  withOpenedRound,
  withRoundAppended,
} from './audience.utils';

const BALLOT_TOKEN_HEADER = 'x-ballot-token';

export const audienceKeys = {
  all: ['audience'] as const,
  live: () => [...audienceKeys.all, 'live'] as const,
  ballot: (sessionId: string) => [...audienceKeys.all, 'ballot', sessionId] as const,
  state: (sessionId: string) => [...audienceKeys.all, 'state', sessionId] as const,
  rounds: (sessionId: string) => [...audienceKeys.all, 'rounds', sessionId] as const,
  search: (query: string) => [...audienceKeys.all, 'search', query] as const,
};

const VOTE_MUTATION_KEY = [...audienceKeys.all, 'vote'] as const;

function ballotHeaders(ballotToken: string): { headers: Record<string, string> } {
  return { headers: { [BALLOT_TOKEN_HEADER]: ballotToken } };
}

// @FollowsBlueprint query-module
export function useLiveConcert(isEnabled: boolean) {
  return useQuery({
    queryKey: audienceKeys.live(),
    queryFn: async () => {
      const response = await api.api.audience.live.$get();
      if (!response.ok) throw new ApiError(response.status, `live ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

export function useBallot(sessionId: string, isEnabled = true) {
  return useQuery({
    queryKey: audienceKeys.ballot(sessionId),
    queryFn: async () => {
      const remembered = readBallotToken(sessionId);
      if (remembered !== null) return { ballotToken: remembered };
      const response = await api.api.audience.concerts[':sessionId'].ballot.$post({
        param: { sessionId },
      });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `ballot ${response.status}`, null);
      const minted = await response.json();
      writeBallotToken(sessionId, minted.ballotToken);
      return minted;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: isEnabled,
  });
}

/**
 * @Blueprint query-response-driven-poll
 * @BlueprintName Poll Whose Cadence The Answer Sets
 * @BlueprintUsage Use for data that only moves during a window the server opens and closes, so a fixed interval would either miss the window or run all day.
 * @BlueprintDescription Reads `refetchInterval` from the last response rather than from a constant, so the client polls once a second while the server says a round is open and stops entirely at rest. That keeps a phone left on the page overnight from billing a request a second, and it needs no second query to ask whether polling should be on: the answer already carries it.
 */
export function useConcertVoteState(
  sessionId: string,
  ballotToken: string | null,
  isEnabled = true,
) {
  return useQuery({
    queryKey: audienceKeys.state(sessionId),
    queryFn: async () => {
      const response = await api.api.audience.concerts[':sessionId'].state.$get(
        { param: { sessionId } },
        ballotToken === null ? {} : ballotHeaders(ballotToken),
      );
      if (!response.ok) throw new ApiError(response.status, `state ${response.status}`, null);
      return response.json();
    },
    refetchInterval: (query) => selectPollInterval(query.state.data?.state.round),
    enabled: isEnabled && sessionId !== '',
  });
}

export function useSuggestionSearch(query: string) {
  return useQuery({
    queryKey: audienceKeys.search(query),
    queryFn: async () => {
      const response = await api.api.audience.search.$get({ query: { q: query } });
      if (!response.ok) throw new ApiError(response.status, `search ${response.status}`, null);
      return response.json();
    },
    retry: false,
    enabled: query.trim().length > 0,
  });
}

interface VoteVariables {
  readonly sessionId: string;
  readonly roundId: string;
  readonly songId: string;
  readonly ballotToken: string;
}

// @FollowsBlueprint query-optimistic-mutation
export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: VOTE_MUTATION_KEY,
    mutationFn: async (variables: VoteVariables) => {
      const response = await api.api.audience.rounds[':roundId'].votes.$post(
        { param: { roundId: variables.roundId }, json: { songId: variables.songId } },
        ballotHeaders(variables.ballotToken),
      );
      if (!response.ok) throw new ApiError(response.status, `vote ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const stateKey = audienceKeys.state(variables.sessionId);
      await queryClient.cancelQueries({ queryKey: stateKey });
      const previousState = queryClient.getQueryData<ConcertStateCache>(stateKey);
      queryClient.setQueryData<ConcertStateCache>(stateKey, (old) =>
        applyVoteToState(old, variables.songId, 'cast'),
      );
      return { previousState };
    },
    onError: (_error, variables, context) => {
      if (context?.previousState !== undefined) {
        queryClient.setQueryData(audienceKeys.state(variables.sessionId), context.previousState);
      }
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRetractVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: VOTE_MUTATION_KEY,
    mutationFn: async (variables: VoteVariables) => {
      const response = await api.api.audience.rounds[':roundId'].votes[':songId'].$delete(
        { param: { roundId: variables.roundId, songId: variables.songId } },
        ballotHeaders(variables.ballotToken),
      );
      if (!response.ok) throw new ApiError(response.status, `retract ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const stateKey = audienceKeys.state(variables.sessionId);
      await queryClient.cancelQueries({ queryKey: stateKey });
      const previousState = queryClient.getQueryData<ConcertStateCache>(stateKey);
      queryClient.setQueryData<ConcertStateCache>(stateKey, (old) =>
        applyVoteToState(old, variables.songId, 'retract'),
      );
      return { previousState };
    },
    onError: (_error, variables, context) => {
      if (context?.previousState !== undefined) {
        queryClient.setQueryData(audienceKeys.state(variables.sessionId), context.previousState);
      }
    },
  });
}

interface SuggestionVariables {
  readonly sessionId: string;
  readonly mbid: string;
  readonly ballotToken: string;
}

// @FollowsBlueprint query-optimistic-insert
export function useSuggestSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: SuggestionVariables) => {
      const response = await api.api.audience.concerts[':sessionId'].suggestions.$post(
        { param: { sessionId: variables.sessionId }, json: { mbid: variables.mbid } },
        ballotHeaders(variables.ballotToken),
      );
      if (!response.ok) throw new ApiError(response.status, `suggest ${response.status}`, null);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<ConcertStateCache>(audienceKeys.state(variables.sessionId), (old) =>
        addSuggestedSongToPool(old, data.song),
      );
    },
  });
}

export function useRoundHistory(sessionId: string, isEnabled = true) {
  return useQuery({
    queryKey: audienceKeys.rounds(sessionId),
    queryFn: async () => {
      const response = await api.api.audience.concerts[':sessionId'].rounds.$get({
        param: { sessionId },
      });
      if (!response.ok) throw new ApiError(response.status, `rounds ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useOpenRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { sessionId: string }) => {
      const response = await api.api.audience.concerts[':sessionId'].rounds.$post({
        param: { sessionId: variables.sessionId },
      });
      if (!response.ok) throw new ApiError(response.status, `open-round ${response.status}`, null);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<ConcertStateCache>(audienceKeys.state(variables.sessionId), (old) =>
        withOpenedRound(old, data.round),
      );
      queryClient.setQueryData<RoundHistoryCache>(audienceKeys.rounds(variables.sessionId), (old) =>
        withRoundAppended(old, data.round),
      );
    },
  });
}
