/** @Feature uploads */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const SIGNED_URL_STALE_MINUTES = 4;
const SIGNED_URL_GC_MINUTES = 5;
const SIGNED_URL_STALE_MS = SIGNED_URL_STALE_MINUTES * MILLISECONDS_PER_MINUTE;
const SIGNED_URL_GC_MS = SIGNED_URL_GC_MINUTES * MILLISECONDS_PER_MINUTE;

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
