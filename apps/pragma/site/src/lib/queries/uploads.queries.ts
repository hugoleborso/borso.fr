/**
 * Uploads feature queries / mutations. Presigned PUT for new chart
 * uploads, presigned GET for rendering existing charts.
 *
 * A presigned GET URL expires, so `staleTime` and `gcTime` both sit
 * under the five minute validity window the API signs for, which makes
 * TanStack Query refetch a fresh URL before the held one goes stale.
 * @Feature uploads
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

const SIGNED_URL_STALE_MS = 4 * 60 * 1000;
const SIGNED_URL_GC_MS = 5 * 60 * 1000;

export const uploadKeys = {
  all: ['uploads'] as const,
  signedGet: (objectKey: string) => [...uploadKeys.all, 'sign-get', objectKey] as const,
};

// @FollowsBlueprint query-uncached-mutation
export function useSignChartUpload() {
  return useMutation({
    mutationFn: async (variables: Parameters<typeof api.api.uploads.sign.$post>[0]['json']) => {
      const response = await api.api.uploads.sign.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `sign ${response.status}`, null);
      return response.json();
    },
  });
}

/** Short lived GET URL for a stored chart, or nothing while there is no chart to sign. */
// @FollowsBlueprint query-module
export function useSignedChartUrl(objectKey: string | null) {
  return useQuery({
    queryKey: uploadKeys.signedGet(objectKey ?? ''),
    queryFn: async () => {
      const response = await api.api.uploads['sign-get'].$post({
        json: { objectKey: objectKey ?? '' },
      });
      if (!response.ok) throw new ApiError(response.status, `sign-get ${response.status}`, null);
      return response.json();
    },
    enabled: objectKey !== null,
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_GC_MS,
  });
}
