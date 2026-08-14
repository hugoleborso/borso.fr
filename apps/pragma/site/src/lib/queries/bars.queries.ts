/**
 * Bars (CRM) feature queries / mutations.
 *
 * Every cache-touching mutation is optimistic (round 17c). The kanban
 * DnD case (`useUpdateBar` switching `status`) is the most visible —
 * the card moves to the new column the instant the operator drops it,
 * the server confirms in the background, and a 500 rolls the card back
 * to its previous column.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { isLastPendingMutation, replaceEntityById } from './optimistic.utils';

export const barKeys = {
  all: ['bars'] as const,
  list: () => [...barKeys.all, 'list'] as const,
  byId: (id: string) => [...barKeys.all, 'byId', id] as const,
};

type BarsListResponse = InferResponseType<typeof api.api.bars.$get>;
type BarRow = BarsListResponse['bars'][number];
type BarCreateVariables = Parameters<typeof api.api.bars.$post>[0]['json'];
type BarUpdateVariables = { id: string } & Parameters<
  (typeof api.api.bars)[':id']['$put']
>[0]['json'];

const NEW_BAR_DEFAULTS: Pick<
  BarRow,
  | 'notes'
  | 'lastInteractionAt'
  | 'city'
  | 'capacity'
  | 'contactName'
  | 'contactEmail'
  | 'contactPhone'
> = {
  notes: '',
  lastInteractionAt: null,
  city: null,
  capacity: null,
  contactName: null,
  contactEmail: null,
  contactPhone: null,
};

function buildOptimisticBar(id: string, input: BarCreateVariables): BarRow {
  return { ...NEW_BAR_DEFAULTS, ...input, id };
}

export function useBarsList() {
  return useQuery({
    queryKey: barKeys.list(),
    queryFn: async () => {
      const response = await api.api.bars.$get();
      if (!response.ok) throw new ApiError(response.status, `bars ${response.status}`, null);
      return response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useCreateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: barKeys.all,
    mutationFn: async (variables: BarCreateVariables) => {
      const response = await api.api.bars.$post({ json: variables });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = barKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<BarsListResponse>(listKey);
      const temporaryId = crypto.randomUUID();
      queryClient.setQueryData<BarsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        const inserted = buildOptimisticBar(temporaryId, variables);
        const next = [...old.bars, inserted].toSorted((left, right) =>
          left.name.localeCompare(right.name),
        );
        return { bars: next };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(barKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: barKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: barKeys.all });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: barKeys.all,
    mutationFn: async (variables: BarUpdateVariables) => {
      const { id, ...rest } = variables;
      const response = await api.api.bars[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = barKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<BarsListResponse>(listKey);
      const { id, ...patch } = variables;
      queryClient.setQueryData<BarsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return {
          bars: replaceEntityById(old.bars, id, (bar) => ({ ...bar, ...patch })),
        };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(barKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: barKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: barKeys.all });
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: barKeys.all,
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.bars[':id'].$delete({ param: { id: variables.id } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = barKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<BarsListResponse>(listKey);
      queryClient.setQueryData<BarsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { bars: old.bars.filter((bar) => bar.id !== variables.id) };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(barKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: barKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: barKeys.all });
    },
  });
}
