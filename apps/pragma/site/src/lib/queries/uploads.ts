/**
 * Uploads feature mutations. Presigned PUT for new chart uploads,
 * presigned GET for rendering existing charts. No `useQuery` because
 * presigned URLs are inherently single-use and shouldn't be cached.
 */

import { useMutation } from '@tanstack/react-query';
import { ApiError, api } from '../api';

export function useSignChartUpload() {
  return useMutation({
    mutationFn: async (
      variables: Parameters<typeof api.api.uploads.sign.$post>[0]['json'],
    ) => {
      const response = await api.api.uploads.sign.$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `sign ${response.status}`, null);
      return response.json();
    },
  });
}

export function useSignChartGet() {
  return useMutation({
    mutationFn: async (variables: { objectKey: string }) => {
      const response = await api.api.uploads['sign-get'].$post({ json: variables });
      if (!response.ok) throw new ApiError(response.status, `sign-get ${response.status}`, null);
      return response.json();
    },
  });
}
