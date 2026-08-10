/**
 * Edition reads and writes.
 *
 * Every write here produces data only the server can compute — the parsed GPX
 * track, the sunrise and sunset times, the persisted status — so each one
 * invalidates the edition keys in `onSuccess` rather than trying to guess the
 * new row on the client.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const editionKeys = {
  all: ['editions'] as const,
  list: () => [...editionKeys.all, 'list'] as const,
  current: () => [...editionKeys.all, 'current'] as const,
};

export interface CreateEditionVariables {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes: number;
  readonly gpxXml: string;
}

export interface ReplaceEditionVariables {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes: number;
  readonly gpxXml?: string;
}

export type EditionStatusName = 'setup' | 'live' | 'finished';

export interface TransitionEditionStatusVariables {
  readonly slug: string;
  readonly status: EditionStatusName;
}

export function useCurrentEdition() {
  return useQuery({
    queryKey: editionKeys.current(),
    queryFn: async () => {
      const response = await api.api.editions.current.$get();
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}

export function useEditionList() {
  return useQuery({
    queryKey: editionKeys.list(),
    queryFn: async () => {
      const response = await api.api.editions.$get();
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}

export function useCreateEdition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: CreateEditionVariables) => {
      const response = await api.api.admin.editions.$post({ json: variables });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}

export function useReplaceEdition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: ReplaceEditionVariables) => {
      const { slug, ...body } = variables;
      const response = await api.api.admin.editions[':slug'].$put({ param: { slug }, json: body });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}

export function useDeleteEdition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { slug: string }) => {
      const response = await api.api.admin.editions[':slug'].$delete({
        param: { slug: variables.slug },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}

export function useTransitionEditionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: TransitionEditionStatusVariables) => {
      const response = await api.api.admin.editions[':slug'].status.$put({
        param: { slug: variables.slug },
        json: { status: variables.status },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },
  });
}
