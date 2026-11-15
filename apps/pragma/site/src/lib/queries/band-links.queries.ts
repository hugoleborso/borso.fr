/** @Feature band */

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readErrorBody } from '../api.client';
import { writeKeepingStaleness } from './cache-write.queries';
import { settleTemporaryEntity } from './optimistic.utils';

const BAND_LINKS_WRITE_SCOPE = { id: 'band-links-writes' } as const;

export const bandLinkKeys = {
  all: ['band-links'] as const,
  list: () => [...bandLinkKeys.all, 'list'] as const,
};

type BandLinksListResponse = InferResponseType<(typeof api.api)['band-links']['$get'], 200>;
export type BandLinkRecord = BandLinksListResponse['bandLinks'][number];

export interface BandLinkCreation {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

interface ListSnapshot {
  readonly previousList: BandLinksListResponse | undefined;
}

async function throwUnlessSuccessful(
  response: { readonly ok: boolean; readonly status: number; json: () => Promise<unknown> },
  label: string,
): Promise<void> {
  if (isResponseSuccessful(response)) return;
  throw new ApiError(
    response.status,
    `${label} ${String(response.status)}`,
    await readErrorBody(response),
  );
}

function settleList(
  queryClient: QueryClient,
  rewrite: (bandLinks: readonly BandLinkRecord[]) => BandLinkRecord[],
): void {
  writeKeepingStaleness<BandLinksListResponse>(queryClient, bandLinkKeys.list(), (old) => {
    if (old === undefined) return old;
    return { bandLinks: rewrite(old.bandLinks) };
  });
}

async function writeList(
  queryClient: QueryClient,
  rewrite: (bandLinks: readonly BandLinkRecord[]) => BandLinkRecord[],
): Promise<ListSnapshot> {
  await queryClient.cancelQueries({ queryKey: bandLinkKeys.list() });
  const previousList = queryClient.getQueryData<BandLinksListResponse>(bandLinkKeys.list());
  settleList(queryClient, rewrite);
  return { previousList };
}

function restoreList(queryClient: QueryClient, snapshot: ListSnapshot | undefined): void {
  if (snapshot?.previousList === undefined) return;
  writeKeepingStaleness(queryClient, bandLinkKeys.list(), snapshot.previousList);
}

// @FollowsBlueprint query-module
export function useBandLinks() {
  return useQuery({
    queryKey: bandLinkKeys.list(),
    queryFn: async () => {
      const response = await api.api['band-links'].$get();
      if (!response.ok) {
        throw new ApiError(response.status, `band links ${response.status}`, null);
      }
      return response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-insert
export function useAddBandLink() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: BAND_LINKS_WRITE_SCOPE,
    mutationKey: bandLinkKeys.all,
    mutationFn: async (bandLink: BandLinkCreation) => {
      const response = await api.api['band-links'].$post({ json: bandLink });
      await throwUnlessSuccessful(response, 'add band link');
      return response.json();
    },
    onMutate: async (bandLink) => {
      const optimistic: BandLinkRecord = { ...bandLink, createdAt: new Date().toISOString() };
      const snapshot = await writeList(queryClient, (bandLinks) => [
        ...bandLinks.filter((listed) => listed.id !== bandLink.id),
        optimistic,
      ]);
      return { ...snapshot, temporaryId: bandLink.id };
    },
    onSuccess: (data, _variables, context) => {
      if (!('bandLink' in data)) return;
      settleList(queryClient, (bandLinks) =>
        settleTemporaryEntity(bandLinks, context.temporaryId, data.bandLink),
      );
    },
    onError: (_error, _variables, context) => {
      restoreList(queryClient, context);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteBandLink() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: BAND_LINKS_WRITE_SCOPE,
    mutationKey: bandLinkKeys.all,
    mutationFn: async ({ id }: { readonly id: string }) => {
      const response = await api.api['band-links'][':id'].$delete({ param: { id } });
      await throwUnlessSuccessful(response, 'delete band link');
      return response.json();
    },
    onMutate: async ({ id }) =>
      await writeList(queryClient, (bandLinks) => bandLinks.filter((link) => link.id !== id)),
    onError: (_error, _variables, context) => {
      restoreList(queryClient, context);
    },
  });
}
