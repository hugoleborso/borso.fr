import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { PENDING_PROPOSAL_STATUS } from '@domain/proposal.core';
import { ApiError, api, readFailureBody } from '../api.client';
import { useMutationToasts } from '../toast.hook';
import { replaceBySlug, setStatusBySlug } from './cache-updates.core';
import { DECISION_CANCELLED_TOAST, selectDecisionToast } from './mutation-toasts.core';
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

interface ProposalCacheSnapshot {
  readonly previousList: ProposalsResponse | undefined;
  readonly previousOverview: TodayResponse | undefined;
}

async function overlayProposalStatus(
  queryClient: QueryClient,
  change: { slug: string; status: string; pendingCountDelta: number },
): Promise<ProposalCacheSnapshot> {
  const listKey = proposalKeys.list();
  await queryClient.cancelQueries({ queryKey: listKey });
  const overviewKey = todayKeys.overview();
  await queryClient.cancelQueries({ queryKey: overviewKey });
  const previousList = queryClient.getQueryData<ProposalsResponse>(listKey);
  const previousOverview = queryClient.getQueryData<TodayResponse>(overviewKey);
  queryClient.setQueryData<ProposalsResponse>(listKey, (old) => {
    if (old === undefined) return old;
    return setStatusBySlug(old, change.slug, change.status);
  });
  queryClient.setQueryData<TodayResponse>(overviewKey, (old) => {
    if (old === undefined) return old;
    const pendingProposalCount = Math.max(0, old.pendingProposalCount + change.pendingCountDelta);
    return { ...old, pendingProposalCount };
  });
  return { previousList, previousOverview };
}

function restoreProposalCaches(
  queryClient: QueryClient,
  snapshot: ProposalCacheSnapshot | undefined,
): void {
  if (snapshot?.previousList !== undefined) {
    queryClient.setQueryData(proposalKeys.list(), snapshot.previousList);
  }
  if (snapshot?.previousOverview !== undefined) {
    queryClient.setQueryData(todayKeys.overview(), snapshot.previousOverview);
  }
}

function storeSavedProposal(queryClient: QueryClient, saved: ProposalsResponse[number]): void {
  queryClient.setQueryData<ProposalsResponse>(proposalKeys.list(), (old) => {
    if (old === undefined) return old;
    return replaceBySlug(old, saved);
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDecideProposal() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const cancelDecision = useCancelProposalDecision();
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
    onMutate: async (variables) =>
      await overlayProposalStatus(queryClient, {
        slug: variables.slug,
        status: variables.decision,
        pendingCountDelta: -1,
      }),
    onSuccess: (savedProposal, variables) => {
      toasts.confirm(selectDecisionToast(variables.decision), {
        labelKey: 'toast.undo',
        onAction: () => cancelDecision.mutate({ slug: variables.slug }),
      });
      storeSavedProposal(queryClient, savedProposal);
    },
    onError: (failure, _variables, snapshot) => {
      toasts.fail(failure, 'proposals.error');
      restoreProposalCaches(queryClient, snapshot);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useCancelProposalDecision() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (variables: { slug: string }) => {
      const response = await api.api.proposals[':slug'].decision.$delete({
        param: { slug: variables.slug },
      });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `decision cancellation ${response.status}`,
          await readFailureBody(response),
        );
      }
      return await response.json();
    },
    onMutate: async (variables) =>
      await overlayProposalStatus(queryClient, {
        slug: variables.slug,
        status: PENDING_PROPOSAL_STATUS,
        pendingCountDelta: 1,
      }),
    onSuccess: (reopenedProposal) => {
      toasts.confirm(DECISION_CANCELLED_TOAST);
      storeSavedProposal(queryClient, reopenedProposal);
    },
    onError: (failure, _variables, snapshot) => {
      toasts.fail(failure, 'proposals.cancel-error');
      restoreProposalCaches(queryClient, snapshot);
    },
  });
}
