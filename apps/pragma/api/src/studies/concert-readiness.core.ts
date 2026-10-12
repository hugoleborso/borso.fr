import { type Lineup, resolveLineup } from '@domain/lineup.core';
import { selectUpcomingConcerts } from '@domain/upcoming-concerts.core';
import { type DefaultMap, meanForSong, type OverrideMap } from '../mastery/mastery.core';

export const READINESS_THRESHOLD = 7;

export interface ConcertEntryLineup {
  readonly songId: string;
  readonly lineupOverride: Lineup | null;
}

export interface SongLineups {
  readonly songId: string;
  readonly lineups: readonly Lineup[];
}

const NO_LINEUP: Lineup = {};

// @FollowsBlueprint core-projection
export function groupLineupsBySong(
  entries: readonly ConcertEntryLineup[],
  defaultLineupBySong: ReadonlyMap<string, Lineup>,
): SongLineups[] {
  const lineupsBySong = new Map<string, Lineup[]>();
  for (const entry of entries) {
    const defaultLineup = defaultLineupBySong.get(entry.songId) ?? NO_LINEUP;
    const lineup = resolveLineup(defaultLineup, entry.lineupOverride);
    const lineups = lineupsBySong.get(entry.songId) ?? [];
    lineups.push(lineup);
    lineupsBySong.set(entry.songId, lineups);
  }
  return [...lineupsBySong].map(([songId, lineups]) => ({ songId, lineups }));
}

// @FollowsBlueprint core-decision
export function isSongReady(
  defaults: DefaultMap,
  overrides: OverrideMap,
  song: SongLineups,
): boolean {
  if (song.lineups.length === 0) return false;
  return song.lineups.every((lineup) => {
    const mean = meanForSong(defaults, overrides, song.songId, lineup);
    return mean !== null && mean >= READINESS_THRESHOLD;
  });
}

export interface ConcertCandidate {
  readonly id: string;
  readonly kind: string;
  readonly date: Date;
}

export function selectNextConcert<TSession extends ConcertCandidate>(
  sessions: readonly TSession[],
  now: Date,
): TSession | null {
  const upcoming = selectUpcomingConcerts(sessions, now.getTime());
  const byDate = [...upcoming].sort(
    (first, second) => first.date.getTime() - second.date.getTime(),
  );
  return byDate[0] ?? null;
}
