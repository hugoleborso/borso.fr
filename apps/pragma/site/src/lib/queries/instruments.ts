/**
 * Instruments feature queries / mutations. Pure CRUD over the
 * `/api/instruments` route. Mutations apply an optimistic update on
 * `instrumentKeys.list()` (round 17c) so the admin form's create/edit/
 * delete feels instant; `onSettled` invalidates to reconcile.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api';
import { isLastPendingMutation, replaceEntityById } from './optimistic.utils';

export const instrumentKeys = {
  all: ['instruments'] as const,
  list: () => [...instrumentKeys.all, 'list'] as const,
};

type InstrumentsListResponse = InferResponseType<typeof api.api.instruments.$get>;
type InstrumentRow = InstrumentsListResponse['instruments'][number];

async function listInstruments() {
  const response = await api.api.instruments.$get();
  if (!response.ok) throw new ApiError(response.status, `instruments ${response.status}`, null);
  return response.json();
}

export function useInstrumentsList() {
  return useQuery({
    queryKey: instrumentKeys.list(),
    queryFn: listInstruments,
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useCreateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: instrumentKeys.all,
    mutationFn: async (variables: { name: string; isHarmonic: boolean }) => {
      const response = await api.api.instruments.$post({ json: variables });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = instrumentKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<InstrumentsListResponse>(listKey);
      const temporaryId = crypto.randomUUID();
      const inserted: InstrumentRow = { id: temporaryId, ...variables };
      queryClient.setQueryData<InstrumentsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { instruments: [...old.instruments, inserted] };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(instrumentKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: instrumentKeys.all })))
        return;
      void queryClient.invalidateQueries({ queryKey: instrumentKeys.all });
    },
  });
}

export function useUpdateInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: instrumentKeys.all,
    mutationFn: async (variables: { id: string; name?: string; isHarmonic?: boolean }) => {
      const { id, ...rest } = variables;
      const response = await api.api.instruments[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = instrumentKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<InstrumentsListResponse>(listKey);
      const { id, ...patch } = variables;
      queryClient.setQueryData<InstrumentsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return {
          instruments: replaceEntityById(old.instruments, id, (instrument) => ({
            ...instrument,
            ...patch,
          })),
        };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(instrumentKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: instrumentKeys.all })))
        return;
      void queryClient.invalidateQueries({ queryKey: instrumentKeys.all });
    },
  });
}

export function useDeleteInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: instrumentKeys.all,
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.instruments[':id'].$delete({
        param: { id: variables.id },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = instrumentKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<InstrumentsListResponse>(listKey);
      queryClient.setQueryData<InstrumentsListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return {
          instruments: old.instruments.filter((instrument) => instrument.id !== variables.id),
        };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(instrumentKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: instrumentKeys.all })))
        return;
      void queryClient.invalidateQueries({ queryKey: instrumentKeys.all });
    },
  });
}
