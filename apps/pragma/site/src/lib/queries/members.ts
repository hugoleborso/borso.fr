/**
 * Members feature queries / mutations. Reads the members list, the
 * per-member instruments roster, and writes the matching mutations
 * (create / update / delete + assign instruments).
 *
 * Mutations are optimistic (round 17c) — the members list reflects
 * the change immediately, and `useAssignMemberInstruments` swaps the
 * member's instrument roster in place before the server confirms.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api';
import { instrumentKeys } from './instruments';
import { isLastPendingMutation } from './optimistic.utils';

type InstrumentsListResponse = InferResponseType<typeof api.api.instruments.$get>;

export const memberKeys = {
  all: ['members'] as const,
  list: () => [...memberKeys.all, 'list'] as const,
  instrumentsOf: (memberId: string) => [...memberKeys.all, 'instruments', memberId] as const,
};

type MembersListResponse = InferResponseType<typeof api.api.members.$get>;
type MemberRow = MembersListResponse['members'][number];
type MemberInstrumentsResponse = InferResponseType<
  (typeof api.api.members)[':id']['instruments']['$get']
>;

// @FollowsBlueprint query-module
export function useMembersList() {
  return useQuery({
    queryKey: memberKeys.list(),
    queryFn: async () => {
      const response = await api.api.members.$get();
      if (!response.ok) throw new ApiError(response.status, `members ${response.status}`, null);
      return response.json();
    },
  });
}

export function useMemberInstruments(memberId: string, isEnabled = true) {
  return useQuery({
    queryKey: memberKeys.instrumentsOf(memberId),
    queryFn: async () => {
      const response = await api.api.members[':id'].instruments.$get({
        param: { id: memberId },
      });
      if (!response.ok) {
        throw new ApiError(response.status, `member-instruments ${response.status}`, null);
      }
      return response.json();
    },
    enabled: isEnabled,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: memberKeys.all,
    mutationFn: async (variables: {
      firstName: string;
      color: string;
      avatarS3Key?: string | null;
    }) => {
      const response = await api.api.members.$post({ json: variables });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = memberKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<MembersListResponse>(listKey);
      const temporaryId = crypto.randomUUID();
      const inserted: MemberRow = {
        id: temporaryId,
        firstName: variables.firstName,
        color: variables.color,
        avatarS3Key: variables.avatarS3Key ?? null,
      };
      queryClient.setQueryData<MembersListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { members: [...old.members, inserted] };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(memberKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: memberKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: memberKeys.all,
    mutationFn: async (variables: {
      id: string;
      firstName?: string;
      color?: string;
      avatarS3Key?: string | null;
    }) => {
      const { id, ...rest } = variables;
      const response = await api.api.members[':id'].$put({
        param: { id },
        json: rest,
      });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = memberKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<MembersListResponse>(listKey);
      const { id, ...patch } = variables;
      queryClient.setQueryData<MembersListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return {
          members: old.members.map((member) =>
            member.id === id ? { ...member, ...patch } : member,
          ),
        };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(memberKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: memberKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: memberKeys.all,
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.members[':id'].$delete({
        param: { id: variables.id },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = memberKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<MembersListResponse>(listKey);
      queryClient.setQueryData<MembersListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { members: old.members.filter((member) => member.id !== variables.id) };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(memberKeys.list(), context.previousList);
      }
    },
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: memberKeys.all }))) return;
      void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useAssignMemberInstruments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: memberKeys.all,
    mutationFn: async (variables: { memberId: string; instrumentIds: string[] }) => {
      const response = await api.api.members[':id'].instruments.$put({
        param: { id: variables.memberId },
        json: { instrumentIds: variables.instrumentIds },
      });
      if (!response.ok) throw new ApiError(response.status, `assign ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const rosterKey = memberKeys.instrumentsOf(variables.memberId);
      await queryClient.cancelQueries({ queryKey: rosterKey });
      const previousRoster = queryClient.getQueryData<MemberInstrumentsResponse>(rosterKey);
      const allInstruments = queryClient.getQueryData<InstrumentsListResponse>(
        instrumentKeys.list(),
      );
      queryClient.setQueryData<MemberInstrumentsResponse>(rosterKey, (old) => {
        if (old === undefined) return old;
        if (allInstruments === undefined) {
          return {
            instruments: old.instruments.filter((instrument) =>
              variables.instrumentIds.includes(instrument.id),
            ),
          };
        }
        const byId = new Map(
          allInstruments.instruments.map((instrument) => [instrument.id, instrument]),
        );
        const nextInstruments = variables.instrumentIds.flatMap((id) => {
          const instrument = byId.get(id);
          return instrument === undefined ? [] : [instrument];
        });
        return { instruments: nextInstruments };
      });
      return { previousRoster };
    },
    onError: (_err, variables, context) => {
      if (context?.previousRoster !== undefined) {
        queryClient.setQueryData(
          memberKeys.instrumentsOf(variables.memberId),
          context.previousRoster,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: memberKeys.all }))) return;
      void queryClient.invalidateQueries({
        queryKey: memberKeys.instrumentsOf(variables.memberId),
      });
    },
  });
}
