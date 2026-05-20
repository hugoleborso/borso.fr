/**
 * Lightweight nav-badge hook. Hits the cheap list endpoints in
 * parallel once on mount and returns a {to → count} map keyed by the
 * sidebar nav `to` value.
 *
 * Failure is silent: a 404 / 500 / network error simply leaves that
 * entry's badge undefined, and `SidebarLink` skips rendering. The
 * sidebar should never block on these counts.
 */

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiRequest } from '../../lib/api-client';

const songListSchema = z.object({
  songs: z.array(
    z.object({ status: z.string() }).passthrough(),
  ),
});
const sessionListSchema = z.object({
  sessions: z.array(
    z.object({ date: z.string(), kind: z.string() }).passthrough(),
  ),
});
const barListSchema = z.object({
  bars: z.array(z.object({}).passthrough()),
});

export type NavBadgeMap = Readonly<Record<string, number | undefined>>;

async function safeCount(
  path: string,
  selector: (body: unknown) => number,
): Promise<number | undefined> {
  try {
    const body = await apiRequest(path);
    return selector(body);
  } catch {
    return undefined;
  }
}

export function useNavBadges(): NavBadgeMap {
  const [badges, setBadges] = useState<NavBadgeMap>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const [songsReady, upcomingConcerts, barsCount] = await Promise.all([
        safeCount('/api/songs', (body) => {
          const parsed = songListSchema.safeParse(body);
          if (!parsed.success) return 0;
          return parsed.data.songs.filter((song) => song.status === 'concert_ready').length;
        }),
        safeCount('/api/sessions', (body) => {
          const parsed = sessionListSchema.safeParse(body);
          if (!parsed.success) return 0;
          return parsed.data.sessions.filter(
            (session) =>
              session.kind === 'concert' && new Date(session.date).getTime() > now,
          ).length;
        }),
        safeCount('/api/bars', (body) => {
          const parsed = barListSchema.safeParse(body);
          if (!parsed.success) return 0;
          return parsed.data.bars.length;
        }),
      ]);
      if (cancelled) return;
      setBadges({
        '/catalog': songsReady,
        '/sessions': upcomingConcerts,
        '/setlists': upcomingConcerts,
        '/bars': barsCount,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return badges;
}
