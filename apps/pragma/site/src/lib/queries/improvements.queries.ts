/** @Feature improvements */

import { rankImprovements } from '@domain/improvement.core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { applyVoteIntent, type VoteIntent } from './improvements.utils';
import { replaceEntityById } from './optimistic.utils';

export const improvementKeys = {
  all: ['improvements'] as const,
  list: () => [...improvementKeys.all, 'list'] as const,
};

type ImprovementsListResponse = InferResponseType<typeof api.api.improvements.$get>;
export type ImprovementRow = ImprovementsListResponse['improvements'][number];
type ImprovementCreateVariables = Parameters<typeof api.api.improvements.$post>[0]['json'];
type ImprovementUpdateVariables = { id: string } & Parameters<
  (typeof api.api.improvements)[':id']['$put']
>[0]['json'];

async function listImprovements() {
  const response = await api.api.improvements.$get();
  if (!response.ok) throw new ApiError(response.status, `improvements ${response.status}`, null);
  return response.json();
}

export function useImprovementsList() {
  return useQuery({
    queryKey: improvementKeys.list(),
    queryFn: listImprovements,
  });
}

function writeList(
  queryClient: ReturnType<typeof useQueryClient>,
  rewrite: (improvements: readonly ImprovementRow[]) => ImprovementRow[],
): void {
  queryClient.setQueryData<ImprovementsListResponse>(improvementKeys.list(), (old) => {
    if (old === undefined) return old;
    return { improvements: rankImprovements(rewrite(old.improvements)) };
  });
}

export function useCreateImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: improvementKeys.all,
    mutationFn: async (variables: ImprovementCreateVariables) => {
      const response = await api.api.improvements.$post({ json: variables });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onSuccess: (data) => {
      writeList(queryClient, (improvements) => [...improvements, data.improvement]);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: improvementKeys.all,
    mutationFn: async (variables: ImprovementUpdateVariables) => {
      const { id, ...rest } = variables;
      const response = await api.api.improvements[':id'].$put({ param: { id }, json: rest });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = improvementKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<ImprovementsListResponse>(listKey);
      const { id, ...patch } = variables;
      writeList(queryClient, (improvements) =>
        replaceEntityById(improvements, id, (improvement) => ({ ...improvement, ...patch })),
      );
      return { previousList };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(improvementKeys.list(), context.previousList);
      }
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: improvementKeys.all,
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.improvements[':id'].$delete({ param: { id: variables.id } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = improvementKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<ImprovementsListResponse>(listKey);
      writeList(queryClient, (improvements) =>
        improvements.filter((improvement) => improvement.id !== variables.id),
      );
      return { previousList };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(improvementKeys.list(), context.previousList);
      }
    },
  });
}

const VOTE_REQUEST_BY_INTENT = {
  cast: (id: string) => api.api.improvements[':id'].vote.$put({ param: { id } }),
  withdraw: (id: string) => api.api.improvements[':id'].vote.$delete({ param: { id } }),
} as const satisfies Record<VoteIntent, (id: string) => Promise<Response>>;

export interface VoteVariables {
  readonly id: string;
  readonly intent: VoteIntent;
}

// @FollowsBlueprint query-optimistic-mutation
export function useVoteOnImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: improvementKeys.all,
    mutationFn: async (variables: VoteVariables) => {
      const response = await VOTE_REQUEST_BY_INTENT[variables.intent](variables.id);
      if (!response.ok) throw new ApiError(response.status, `vote ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = improvementKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<ImprovementsListResponse>(listKey);
      writeList(queryClient, (improvements) =>
        replaceEntityById(improvements, variables.id, (improvement) =>
          applyVoteIntent(improvement, variables.intent),
        ),
      );
      return { previousList };
    },
    onSuccess: (data) => {
      writeList(queryClient, (improvements) =>
        replaceEntityById(improvements, data.improvement.id, () => data.improvement),
      );
    },
    onError: (_error, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(improvementKeys.list(), context.previousList);
      }
    },
  });
}
