/**
 * Lightweight nav-badge hook. Reuses the catalog / sessions / bars
 * list queries so the cache is shared with the destination pages —
 * once the user navigates to /catalog, the catalog page hits a warm
 * cache (no second request).
 *
 * Failure is silent: a 404 / 500 / network error simply leaves that
 * entry's badge undefined, and `SidebarLink` skips rendering.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock-store';
import { useBarsList } from '../../lib/queries/bars';
import { useSessionsList } from '../../lib/queries/sessions';
import { useSongsList } from '../../lib/queries/songs';
import { selectUpcomingConcerts } from '../../lib/upcoming-concerts.core';

export type NavBadgeMap = Readonly<Record<string, number | undefined>>;

export function useNavBadges(): NavBadgeMap {
  const songs = useSongsList();
  const sessions = useSessionsList();
  const bars = useBarsList();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);

  return useMemo<NavBadgeMap>(() => {
    const songsReady = songs.data?.songs.filter((song) => song.status === 'concert_ready').length;
    const upcomingSessions = sessions.data?.sessions;
    const upcomingConcerts =
      upcomingSessions === undefined
        ? undefined
        : selectUpcomingConcerts(upcomingSessions, nowEpochMs).length;
    const barsCount = bars.data?.bars.length;
    return {
      '/catalog': songsReady,
      '/sessions': upcomingConcerts,
      '/setlists': upcomingConcerts,
      '/bars': barsCount,
    };
  }, [songs.data, sessions.data, bars.data, nowEpochMs]);
}
