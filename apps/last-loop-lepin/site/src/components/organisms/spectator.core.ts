import type { RaceEditionDto } from '../../lib/race.types';

const MINUTES_TO_MS = 60_000;

export type SpectatorView = 'waiting' | 'racing';

// @FollowsBlueprint core-view-intent
export function selectSpectatorView(edition: RaceEditionDto | null): SpectatorView {
  if (edition === null) return 'waiting';
  if (edition.status === 'setup') return 'waiting';
  return 'racing';
}

export function isRaceOver(edition: RaceEditionDto, hasStandingsEnded: boolean): boolean {
  return edition.status === 'finished' || hasStandingsEnded;
}

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

export function selectRacingEdition(edition: RaceEditionDto | null): RaceEditionDto | null {
  if (selectSpectatorView(edition) !== 'racing') return null;
  return edition;
}

export function isShowingAnnouncement(
  hasEditionFailed: boolean,
  edition: RaceEditionDto | null,
): boolean {
  if (hasEditionFailed) return false;
  return selectSpectatorView(edition) === 'waiting';
}
