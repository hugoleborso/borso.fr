import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, readFailureBody } from '../api.client';
import { useMutationToasts } from '../toast.hook';
import { applyProposalDecision, replaceProposal } from './cache-updates.core';
import { selectDecisionToast } from './mutation-toasts.core';
import { todayKeys } from './today.queries';

export const proposalKeys = {
  all: ['proposals'] as const,
  list: () => [...proposalKeys.all, 'list'] as const,
};

type TodayResponse = InferResponseType<typeof api.api.today.$get, 200>;
type ProposalsResponse = InferResponseType<typeof api.api.proposals.$get, 200>;
type DecisionBody = Parameters<(typeof api.api.proposals)[':slug']['decision']['$post']>[0]['json'];

// @FollowsBlueprint query-module
export function useProposals() {
  return useQuery({
    queryKey: proposalKeys.list(),
    queryFn: async () => {
      const response = await api.api.proposals.$get({ query: {} });
      if (!response.ok) throw new ApiError(response.status, `proposals ${response.status}`, null);
      return await response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDecideProposal() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (variables: { slug: string } & DecisionBody) => {
      const { slug, ...body } = variables;
      const response = await api.api.proposals[':slug'].decision.$post({
        param: { slug },
        json: body,
      });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `decision ${response.status}`,
          await readFailureBody(response),
        );
      }
      return await response.json();
    },
    onMutate: async (variables) => {
      const listKey = proposalKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const overviewKey = todayKeys.overview();
      await queryClient.cancelQueries({ queryKey: overviewKey });
      const previousList = queryClient.getQueryData<ProposalsResponse>(listKey);
      const previousOverview = queryClient.getQueryData<TodayResponse>(overviewKey);
      queryClient.setQueryData<ProposalsResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return applyProposalDecision(old, variables.slug, variables.decision);
      });
      queryClient.setQueryData<TodayResponse>(overviewKey, (old) => {
        if (old === undefined) return old;
        return { ...old, pendingProposalCount: Math.max(0, old.pendingProposalCount - 1) };
      });
      return { previousList, previousOverview };
    },
    onSuccess: (savedProposal, variables) => {
      toasts.confirm(selectDecisionToast(variables.decision));
      queryClient.setQueryData<ProposalsResponse>(proposalKeys.list(), (old) => {
        if (old === undefined) return old;
        return replaceProposal(old, savedProposal);
      });
    },
    onError: (failure, _variables, context) => {
      toasts.fail(failure, 'proposals.error');
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(proposalKeys.list(), context.previousList);
      }
      if (context?.previousOverview !== undefined) {
        queryClient.setQueryData(todayKeys.overview(), context.previousOverview);
      }
    },
  });
}
