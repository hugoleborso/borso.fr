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

interface CachedPunch {
  readonly id: string;
}

interface CachedPunchList {
  readonly punches: readonly CachedPunch[];
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

// @FollowsBlueprint query-uncached-mutation
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

// @FollowsBlueprint query-optimistic-mutation
export function useVoidPunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: punchKeys.all,
    mutationFn: async (variables: VoidPunchVariables) => {
      const response = await api.api.admin.punches[':id'].$delete({
        param: { id: variables.punchId },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onMutate: async (variables) => {
      const runnerKey = punchKeys.forRunner(variables.editionSlug, variables.runnerSlug);
      await queryClient.cancelQueries({ queryKey: runnerKey });
      const previousPunches = queryClient.getQueryData<CachedPunchList>(runnerKey);
      queryClient.setQueryData<CachedPunchList>(runnerKey, (old) =>
        old === undefined
          ? old
          : { punches: old.punches.filter((punch) => punch.id !== variables.punchId) },
      );
      return { previousPunches, runnerKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPunches !== undefined) {
        queryClient.setQueryData(context.runnerKey, context.previousPunches);
      }
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
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

// @FollowsBlueprint query-uncached-mutation
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

/**
 * @Blueprint query-uncached-mutation
 * @BlueprintName Uncached Mutation
 * @BlueprintUsage Use for a write whose result no cached query holds, so there is nothing to predict and nothing to invalidate.
 * @BlueprintDescription Carries a `mutationFn` and nothing else. The two other mutation shapes both exist to keep a cache honest, and writing an empty `onSuccess` here to look like them would claim a cache relationship that does not exist. What makes this correct rather than forgetful is the module header naming the query that does surface the write, which for a punch is the standings poll rather than a refetch this mutation could trigger.
 */
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
