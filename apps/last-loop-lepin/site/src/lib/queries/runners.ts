/**
 * Runner reads and writes, plus the presign call that precedes a photo
 * upload. The upload itself goes straight to Amazon with `fetch`, because it
 * does not reach our API; the presign call is the part that does.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export const runnerKeys = {
  all: ['runners'] as const,
  roster: (editionSlug: string) => [...runnerKeys.all, 'roster', editionSlug] as const,
  detail: (editionSlug: string, runnerSlug: string) =>
    [...runnerKeys.all, 'detail', editionSlug, runnerSlug] as const,
};

export type RunnerPhotoContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface CreateRunnerVariables {
  readonly editionSlug: string;
  readonly slug: string;
  readonly displayName: string;
  readonly bib: number;
  readonly photoKey: string | null;
}

export interface PresignRunnerPhotoVariables {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly contentType: RunnerPhotoContentType;
}

export function useRunnerRoster(editionSlug: string) {
  return useQuery({
    queryKey: runnerKeys.roster(editionSlug),
    queryFn: async () => {
      const response = await api.api.editions[':editionSlug'].runners.$get({
        param: { editionSlug },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    enabled: editionSlug !== '',
  });
}

export function useRunner(editionSlug: string, runnerSlug: string) {
  return useQuery({
    queryKey: runnerKeys.detail(editionSlug, runnerSlug),
    queryFn: async () => {
      const response = await api.api.editions[':editionSlug'].runners[':runnerSlug'].$get({
        param: { editionSlug, runnerSlug },
      });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    enabled: editionSlug !== '' && runnerSlug !== '',
  });
}

export function useCreateRunner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: CreateRunnerVariables) => {
      const response = await api.api.admin.runners.$post({ json: variables });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: runnerKeys.roster(variables.editionSlug) });
    },
  });
}

/**
 * Ask the API for a presigned S3 upload target. The caller then `PUT`s the
 * file straight to the returned URL, which is the one request in this site
 * that does not go through the Hono client.
 */
export function usePresignRunnerPhoto() {
  return useMutation({
    mutationFn: async (variables: PresignRunnerPhotoVariables) => {
      const response = await api.api.admin.media.presign.$post({ json: variables });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
  });
}
