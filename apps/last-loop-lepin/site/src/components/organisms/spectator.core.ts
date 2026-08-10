/**
 * The spectator screen's reading of the current edition.
 *
 * The race is over either because the operator closed the edition or because
 * the backyard rule left at most one runner standing, which the standings
 * report on their own.
 */

import type { RaceEditionDto } from '../../lib/race.types';

const MINUTES_TO_MS = 60_000;

export type SpectatorView = 'waiting' | 'racing';

/**
 * Race day shows the live screen; anything else shows the announcement and
 * the archives, which is also what an absent edition shows.
 */
export function selectSpectatorView(edition: RaceEditionDto | null): SpectatorView {
  if (edition === null) return 'waiting';
  if (edition.status === 'setup') return 'waiting';
  return 'racing';
}

export function isRaceOver(edition: RaceEditionDto, hasStandingsEnded: boolean): boolean {
  return edition.status === 'finished' || hasStandingsEnded;
}

/**
 * When the next top of the hour falls. Before the gun that is the start, and
 * after the cut off it is the end, so the counter never runs past the race.
 */
export function projectNextLoopBoundaryMs(edition: RaceEditionDto, nowMs: number): number {
  const startMs = new Date(edition.startsAt).getTime();
  const endMs = new Date(edition.endsAt).getTime();
  if (nowMs <= startMs) return startMs;
  if (nowMs >= endMs) return endMs;
  const intervalMs = edition.intervalMinutes * MINUTES_TO_MS;
  const elapsedIntervals = Math.floor((nowMs - startMs) / intervalMs);
  return startMs + (elapsedIntervals + 1) * intervalMs;
}

export function listFinishedEditions(
  editions: readonly RaceEditionDto[],
): readonly RaceEditionDto[] {
  return editions.filter((edition) => edition.status === 'finished');
}

/** Finished editions, most recent first, which is how the archives read. */
export function listArchivedEditions(
  editions: readonly RaceEditionDto[],
): readonly RaceEditionDto[] {
  return listFinishedEditions(editions).toSorted(
    (left, right) => new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime(),
  );
}

export function readCorrectionInstant(mostRecentCorrectionAt: string | null): Date | null {
  if (mostRecentCorrectionAt === null) return null;
  return new Date(mostRecentCorrectionAt);
}

export function collectFastestLapSlugs(
  fastestLap: readonly { readonly runnerSlug: string }[],
): ReadonlySet<string> {
  return new Set(fastestLap.map((entry) => entry.runnerSlug));
}

/** The edition to render the live screen for, if the screen should show one. */
export function selectRacingEdition(edition: RaceEditionDto | null): RaceEditionDto | null {
  if (selectSpectatorView(edition) !== 'racing') return null;
  return edition;
}

/**
 * Whether the announcement screen is what the spectator sees. A failed edition
 * request shows the outage message instead, so neither screen is shown twice.
 */
export function isShowingAnnouncement(
  hasEditionFailed: boolean,
  edition: RaceEditionDto | null,
): boolean {
  if (hasEditionFailed) return false;
  return selectSpectatorView(edition) === 'waiting';
}
