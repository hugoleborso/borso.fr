/**
 * Punch reads and writes, for the organiser panels and for a runner punching
 * their own loop.
 *
 * Registering a punch does not invalidate the standings. The standings query
 * already polls every two seconds, and a `GET` fired immediately after the
 * write can be served by another Lambda on another database connection that
 * still sees the state from before the commit. The organiser panel shows the
 * pending punch from its own overlay until the poll catches up.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, isResponseSuccessful } from '../api';

// @FollowsBlueprint query-module
export const punchKeys = {
  all: ['punches'] as const,
  forRunner: (editionSlug: string, runnerSlug: string) =>
    [...punchKeys.all, editionSlug, runnerSlug] as const,
};

export interface RegisterPunchVariables {
  readonly editionSlug: string;
  readonly runnerSlug: string;
}

export interface CatchupPunchVariables {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
}

export interface RecordDidNotFinishVariables {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'late' | 'manual';
}

export interface VoidPunchVariables {
  readonly punchId: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
}

export interface SelfPunchVariables {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly clientLat: number | null;
  readonly clientLng: number | null;
  readonly clientAccuracyM: number | null;
}

export function useRunnerPunches(editionSlug: string, runnerSlug: string, isEnabled = true) {
  return useQuery({
    queryKey: punchKeys.forRunner(editionSlug, runnerSlug),
    queryFn: async () => {
      const response = await api.api.editions[':editionSlug'].runners[':runnerSlug'].punches.$get({
        param: { editionSlug, runnerSlug },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    enabled: isEnabled && editionSlug !== '' && runnerSlug !== '',
  });
}

export function useRegisterPunch() {
  return useMutation({
    mutationFn: async (variables: RegisterPunchVariables) => {
      const response = await api.api.admin.punches.$post({ json: variables });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useVoidPunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: VoidPunchVariables) => {
      const response = await api.api.admin.punches[':id'].$delete({
        param: { id: variables.punchId },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: punchKeys.forRunner(variables.editionSlug, variables.runnerSlug),
      });
    },
  });
}

export function useCatchupPunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: CatchupPunchVariables) => {
      const response = await api.api.admin.punches.catchup.$post({ json: variables });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: punchKeys.forRunner(variables.editionSlug, variables.runnerSlug),
      });
    },
  });
}

export function useRecordDidNotFinish() {
  return useMutation({
    mutationFn: async (variables: RecordDidNotFinishVariables) => {
      const response = await api.api.admin.dnfs.$post({ json: variables });
      if (!isResponseSuccessful(response)) {
        throw new ApiError(response.status, await response.json().catch(() => null));
      }
      return response.json();
    },
  });
}

export function useSelfPunch() {
  return useMutation({
    mutationFn: async (variables: SelfPunchVariables) => {
      const response = await api.api['self-punches'].$post({ json: variables });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}
