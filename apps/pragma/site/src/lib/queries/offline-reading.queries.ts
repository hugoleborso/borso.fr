/** @Feature shell */

import { selectNextSession } from '@domain/session-schedule.core';
import type { QueryClient } from '@tanstack/react-query';
import { hasSessionMarker } from '../session-marker.adapter';
import { authKeys, type SessionProbeResult } from './auth.queries';
import {
  type ListedSession,
  sessionQueryOptions,
  sessionsListQueryOptions,
} from './sessions.queries';
import { mapEntriesOfSetlists } from './setlist-entries.queries';
import { mapSetlists, setlistsOfSessionQueryOptions } from './setlists.queries';
import { songKeys, songsListQueryOptions } from './songs.queries';

const NEVER_STALE = 'static';

function isSignedIn(queryClient: QueryClient): boolean {
  return queryClient.getQueryData<SessionProbeResult>(authKeys.session())?.authenticated === true;
}

async function readSessionsList(queryClient: QueryClient): Promise<readonly ListedSession[]> {
  const listOptions = sessionsListQueryOptions();
  const list = await queryClient
    .query(listOptions)
    .catch(() => queryClient.getQueryData(listOptions.queryKey));
  return list?.sessions ?? [];
}

async function seedSongDetails(queryClient: QueryClient): Promise<void> {
  const list = await queryClient
    .query({ ...songsListQueryOptions(), staleTime: NEVER_STALE })
    .catch(() => undefined);
  for (const song of list?.songs ?? []) {
    if (queryClient.getQueryData(songKeys.byId(song.id)) === undefined) {
      queryClient.setQueryData(songKeys.byId(song.id), { song });
    }
  }
}

async function loadNextSession(queryClient: QueryClient, sessionId: string): Promise<void> {
  const [, setlistsOfSession] = await Promise.all([
    queryClient.query({ ...sessionQueryOptions(sessionId), staleTime: NEVER_STALE }),
    queryClient.query({ ...setlistsOfSessionQueryOptions(sessionId), staleTime: NEVER_STALE }),
  ]);
  const setlistIds = setlistsOfSession.setlists.map((setlist) => setlist.id);
  await Promise.all([
    ...mapSetlists(setlistIds, (options) =>
      queryClient.query({ ...options, staleTime: NEVER_STALE }),
    ),
    ...mapEntriesOfSetlists(setlistIds, (options) =>
      queryClient.query({ ...options, staleTime: NEVER_STALE }),
    ),
  ]);
}

// @FollowsBlueprint query-module
export async function loadOfflineReadingWhenSignedIn(queryClient: QueryClient): Promise<void> {
  if (!hasSessionMarker() || !isSignedIn(queryClient)) return;
  const [, sessions] = await Promise.all([
    seedSongDetails(queryClient),
    readSessionsList(queryClient),
  ]);
  const nextSession = selectNextSession(sessions, new Date());
  if (nextSession === null) return;
  await loadNextSession(queryClient, nextSession.id).catch(() => undefined);
}
