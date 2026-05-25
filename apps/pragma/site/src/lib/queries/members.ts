/**
 * Members feature queries / mutations. Reads the members list, the
 * per-member instruments roster, and the writes the matching mutations
 * (create / update / delete + assign instruments).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const memberKeys = {
  all: ['members'] as const,
  list: () => [...memberKeys.all, 'list'] as const,
  instrumentsOf: (memberId: string) => [...memberKeys.all, 'instruments', memberId] as const,
};

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

export function useMemberInstruments(memberId: string, enabled = true) {
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
    enabled,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { firstName: string; color: string; avatarS3Key?: string | null }) => {
      const response = await api.api.members.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.members[':id'].$delete({
        param: { id: variables.id },
      });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useAssignMemberInstruments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { memberId: string; instrumentIds: string[] }) => {
      const response = await api.api.members[':id'].instruments.$put({
        param: { id: variables.memberId },
        json: { instrumentIds: variables.instrumentIds },
      });
      if (!response.ok) throw new ApiError(response.status, `assign ${response.status}`, null);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: memberKeys.instrumentsOf(variables.memberId),
      });
    },
  });
}
