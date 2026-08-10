/**
 * The punching screen's rules.
 *
 * Backyard rule: every loop starts on the top of the hour, not when the
 * previous loop closed, so which loop the organiser is punching comes from
 * the elapsed race time and never from anybody's punches.
 *
 * A punch the organiser just tapped shows as done straight away, from an
 * overlay that carries the loop it belongs to. The overlay needs no clearing
 * when the race ticks into the next loop: an entry recorded against loop
 * three simply stops matching once the current loop is four.
 */

import type { RankedRunnerDto } from '../../lib/race.types';

const MINUTES_TO_MS = 60_000;
const MINIMUM_INTERVAL_MINUTES = 1;
const LATE_PROGRESS_THRESHOLD = 0.85;

export interface PunchLoopClock {
  readonly currentLoopIndex: number;
  /** How far into the current loop the race is, from zero to one. */
  readonly progressInLoop: number;
  readonly minutesToNextTop: number;
}

export function projectPunchLoopClock(
  startsAt: string,
  intervalMinutes: number,
  nowMs: number,
): PunchLoopClock {
  const loopMs = Math.max(intervalMinutes, MINIMUM_INTERVAL_MINUTES) * MINUTES_TO_MS;
  const elapsedMs = Math.max(0, nowMs - new Date(startsAt).getTime());
  const progressInLoop = (elapsedMs % loopMs) / loopMs;
  return {
    currentLoopIndex: Math.floor(elapsedMs / loopMs) + 1,
    progressInLoop,
    minutesToNextTop: Math.max(0, Math.ceil(((1 - progressInLoop) * loopMs) / MINUTES_TO_MS)),
  };
}

export interface PunchOverlay {
  readonly loopIndex: number;
  readonly runnerSlugs: ReadonlySet<string>;
}

export const EMPTY_PUNCH_OVERLAY: PunchOverlay = { loopIndex: 0, runnerSlugs: new Set() };

function overlayFor(overlay: PunchOverlay, loopIndex: number): ReadonlySet<string> {
  if (overlay.loopIndex !== loopIndex) return new Set();
  return overlay.runnerSlugs;
}

/**
 * @Blueprint core-optimistic-overlay
 * @BlueprintName Core Optimistic Overlay
 * @BlueprintUsage Use for the local state that shows a write as applied before the server confirms it.
 * @BlueprintDescription Returns a new `PunchOverlay` rather than mutating one, and stamps it with the loop index it belongs to. `overlayFor` reads the set back only when the stored loop still matches the loop being asked about, so an overlay from an earlier loop stops applying on its own and no timer, effect, or reset call has to clear it. The mirror function `withoutPendingPunch` undoes one entry on a rejected write.
 */
export function withPendingPunch(
  overlay: PunchOverlay,
  loopIndex: number,
  runnerSlug: string,
): PunchOverlay {
  const runnerSlugs = new Set(overlayFor(overlay, loopIndex));
  runnerSlugs.add(runnerSlug);
  return { loopIndex, runnerSlugs };
}

export function withoutPendingPunch(
  overlay: PunchOverlay,
  loopIndex: number,
  runnerSlug: string,
): PunchOverlay {
  const runnerSlugs = new Set(overlayFor(overlay, loopIndex));
  runnerSlugs.delete(runnerSlug);
  return { loopIndex, runnerSlugs };
}

export interface PunchTile {
  readonly entry: RankedRunnerDto;
  readonly isPunched: boolean;
  readonly isLate: boolean;
  readonly closedLoopCount: number;
}

/**
 * One tile per runner still in the race, in standings order. A tile reads as
 * punched once the server credits the current loop or the organiser's own tap
 * is still in flight, and as late when the top of the hour is close and the
 * runner has not come through.
 */
/**
 * @Blueprint core-view-projection
 * @BlueprintName Core View Projection
 * @BlueprintUsage Use for turning fetched data plus the current time into the exact list a component maps over.
 * @BlueprintDescription Takes the standings, the loop clock and the optimistic overlay, and returns one `PunchTile` per runner still racing, with every derived flag already decided. The component only maps the result, so the rules about what counts as punched and what counts as late are covered by a test that calls this function with values. Time arrives as the already projected `PunchLoopClock` rather than as `new Date()`, which is what keeps the projection deterministic.
 */
export function listPunchTiles(
  ranked: readonly RankedRunnerDto[],
  clock: PunchLoopClock,
  overlay: PunchOverlay,
): readonly PunchTile[] {
  const pending = overlayFor(overlay, clock.currentLoopIndex);
  const tiles: PunchTile[] = [];
  for (const entry of ranked) {
    if (entry.status.kind !== 'in-race') continue;
    const isPunchedOnServer = entry.status.lastLoop >= clock.currentLoopIndex;
    const isPunched = isPunchedOnServer || pending.has(entry.runner.slug);
    tiles.push({
      entry,
      isPunched,
      isLate: !isPunched && clock.progressInLoop > LATE_PROGRESS_THRESHOLD,
      closedLoopCount: entry.status.lastLoop,
    });
  }
  return tiles;
}

export function composePunchTileClassName(isPunched: boolean, isLate: boolean): string {
  const punchedModifier = isPunched ? ' punched' : '';
  const lateModifier = isLate ? ' late' : '';
  return `punch-tile${punchedModifier}${lateModifier}`;
}
