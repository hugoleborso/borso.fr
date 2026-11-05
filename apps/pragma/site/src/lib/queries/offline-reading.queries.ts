/** @Feature shell */

import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';
import { hasSessionMarker } from '../session-marker.adapter';
import { sessionProbeQueryOptions } from './auth.queries';
import { type OfflineManifestUrls, selectOfflineReadingTargets } from './offline-reading.utils';
import { sessionQueryOptions } from './sessions.queries';
import { setlistEntriesQueryOptions } from './setlist-entries.queries';
import { setlistsOfSessionQueryOptions } from './setlists.queries';
import { songKeys, songQueryOptions, songsListQueryOptions } from './songs.queries';

const NEVER_STALE = 'static';

export const offlineReadingKeys = {
  manifest: () => ['offline-manifest'] as const,
};

function offlineManifestQueryOptions() {
  return queryOptions({
    queryKey: offlineReadingKeys.manifest(),
    queryFn: async () => {
      const response = await api.api['offline-manifest'].$get();
      if (!response.ok) {
        throw new ApiError(response.status, `offline-manifest ${response.status}`, null);
      }
      return response.json();
    },
  });
}

async function loadNextSession(queryClient: QueryClient, sessionId: string): Promise<void> {
  const [, setlistsOfSession] = await Promise.all([
    queryClient.query({ ...sessionQueryOptions(sessionId), staleTime: NEVER_STALE }),
    queryClient.query({ ...setlistsOfSessionQueryOptions(sessionId), staleTime: NEVER_STALE }),
  ]);
  await Promise.all(
    setlistsOfSession.setlists.map((setlist) =>
      queryClient.query({ ...setlistEntriesQueryOptions(setlist.id), staleTime: NEVER_STALE }),
    ),
  );
}

async function loadSongDetails(
  queryClient: QueryClient,
  songIds: readonly string[],
): Promise<void> {
  const list = await queryClient
    .query({ ...songsListQueryOptions(), staleTime: NEVER_STALE })
    .catch(() => undefined);
  const listedSongs = new Map((list?.songs ?? []).map((song) => [song.id, song]));
  await Promise.allSettled(
    songIds.map(async (songId) => {
      const listedSong = listedSongs.get(songId);
      const isHeld = queryClient.getQueryData(songKeys.byId(songId)) !== undefined;
      if (listedSong !== undefined && !isHeld) {
        queryClient.setQueryData(songKeys.byId(songId), { song: listedSong });
        return;
      }
      await queryClient.query({ ...songQueryOptions(songId), staleTime: NEVER_STALE });
    }),
  );
}

async function loadOfflineReading(
  queryClient: QueryClient,
  manifest: OfflineManifestUrls,
): Promise<void> {
  const targets = selectOfflineReadingTargets(manifest);
  await Promise.allSettled([
    loadSongDetails(queryClient, targets.songIds),
    ...targets.sessionIds.map((sessionId) => loadNextSession(queryClient, sessionId)),
  ]);
}

async function isSignedIn(queryClient: QueryClient): Promise<boolean> {
  const probe = await queryClient.query(sessionProbeQueryOptions()).catch(() => undefined);
  return probe?.authenticated === true;
}

// @FollowsBlueprint query-module
export async function loadOfflineReadingWhenSignedIn(queryClient: QueryClient): Promise<void> {
  if (!hasSessionMarker()) return;
  if (!(await isSignedIn(queryClient))) return;
  const manifestOptions = offlineManifestQueryOptions();
  const manifest = await queryClient
    .query(manifestOptions)
    .catch(() => queryClient.getQueryData(manifestOptions.queryKey));
  if (manifest === undefined) return;
  await loadOfflineReading(queryClient, manifest);
}
