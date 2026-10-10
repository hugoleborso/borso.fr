import type { DraftStatusChange } from '@domain/draft-status.core';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, readFailureBody } from '../api.client';
import { useMutationToasts } from '../toast.hook';
import { replaceBySlug, selectReadyDraftCountDelta, setStatusBySlug } from './cache-updates.core';
import { selectDraftReversal, selectDraftStatusToast } from './mutation-toasts.core';
import { todayKeys } from './today.queries';

export const draftKeys = {
  all: ['drafts'] as const,
  list: () => [...draftKeys.all, 'list'] as const,
};

type DraftsResponse = InferResponseType<typeof api.api.drafts.$get, 200>;
type TodayResponse = InferResponseType<typeof api.api.today.$get, 200>;

interface DraftCacheSnapshot {
  readonly previousList: DraftsResponse | undefined;
  readonly previousOverview: TodayResponse | undefined;
}

async function overlayDraftStatus(
  queryClient: QueryClient,
  change: { readonly slug: string; readonly status: DraftStatusChange },
): Promise<DraftCacheSnapshot> {
  const listKey = draftKeys.list();
  const overviewKey = todayKeys.overview();
  await queryClient.cancelQueries({ queryKey: listKey });
  await queryClient.cancelQueries({ queryKey: overviewKey });
  const previousList = queryClient.getQueryData<DraftsResponse>(listKey);
  const previousOverview = queryClient.getQueryData<TodayResponse>(overviewKey);
  queryClient.setQueryData<DraftsResponse>(listKey, (old) => {
    if (old === undefined) return old;
    return { items: setStatusBySlug(old.items, change.slug, change.status) };
  });
  queryClient.setQueryData<TodayResponse>(overviewKey, (old) => {
    if (old === undefined) return old;
    const readyDraftCount = Math.max(
      0,
      old.readyDraftCount + selectReadyDraftCountDelta(change.status),
    );
    return { ...old, readyDraftCount };
  });
  return { previousList, previousOverview };
}

function restoreDraftCaches(
  queryClient: QueryClient,
  snapshot: DraftCacheSnapshot | undefined,
): void {
  if (snapshot?.previousList !== undefined) {
    queryClient.setQueryData(draftKeys.list(), snapshot.previousList);
  }
  if (snapshot?.previousOverview !== undefined) {
    queryClient.setQueryData(todayKeys.overview(), snapshot.previousOverview);
  }
}

// @FollowsBlueprint query-module
export function useDrafts() {
  return useQuery({
    queryKey: draftKeys.list(),
    queryFn: async () => {
      const response = await api.api.drafts.$get();
      if (!response.ok) throw new ApiError(response.status, `drafts ${response.status}`, null);
      return await response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useChangeDraftStatus() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const changeDraftStatus = useMutation({
    mutationFn: async (variables: { slug: string; status: DraftStatusChange }) => {
      const response = await api.api.drafts[':slug'].$patch({
        param: { slug: variables.slug },
        json: { status: variables.status },
      });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `draft ${response.status}`,
          await readFailureBody(response),
        );
      }
      return await response.json();
    },
    onMutate: async (variables) => await overlayDraftStatus(queryClient, variables),
    onSuccess: (savedDraft, variables) => {
      const reversal = selectDraftReversal(variables.status);
      toasts.confirm(
        selectDraftStatusToast(variables.status),
        reversal === null
          ? undefined
          : {
              labelKey: 'toast.undo',
              onAction: () => changeDraftStatus.mutate({ slug: variables.slug, status: reversal }),
            },
      );
      queryClient.setQueryData<DraftsResponse>(draftKeys.list(), (old) => {
        if (old === undefined) return old;
        return { items: replaceBySlug(old.items, savedDraft) };
      });
    },
    onError: (failure, _variables, snapshot) => {
      toasts.fail(failure, 'drafts.error');
      restoreDraftCaches(queryClient, snapshot);
    },
  });
  return changeDraftStatus;
}
