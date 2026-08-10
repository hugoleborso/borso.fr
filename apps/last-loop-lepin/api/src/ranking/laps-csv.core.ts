/**
 * Per-loop CSV projection — pure.
 *
 * Given a race edition, the current ranked standings, and the raw punches,
 * produce a runner × loops matrix CSV where each cell carries the runner's
 * time on that loop (formula: `loopDurationMs` from `punch.core.ts`).
 *
 * Rows are emitted in the standings order — finishers first, DNFs after,
 * tie-breaks already decided upstream. Voided punches and missing loops
 * leave the cell empty. The point of this export is for runners to
 * compare loop-by-loop pacing after the race; tie-break correctness is
 * left to `ranking.core.ts`.
 */

import { totalHourlyTops } from '../edition/edition.core';
import type { RaceEdition } from '../edition/edition.types';
import { loopDurationMs } from '../punch/punch.core';
import type { LoopPunch } from '../punch/punch.types';
import type { RankedRunner } from './ranking.types';

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const TWO_DIGITS = 2;

function pad(value: number): string {
  return value.toString().padStart(TWO_DIGITS, '0');
}

/**
 * Format a loop duration as `MM:SS` (e.g. `58:14`) when under an hour, or
 * `Hh MM:SS` (e.g. `1h02:13`) when an hour or more. Seconds are floored,
 * not rounded, to avoid `59.6s` rolling over to `01:00`. Negative or null
 * durations yield an empty string — they show up as empty cells in the
 * CSV (clock-skew degenerate or no punch).
 */
export function formatLoopDuration(durationMs: number | null): string {
  if (durationMs === null) return '';
  if (durationMs < 0) return '';
  const totalSeconds = Math.floor(durationMs / MILLISECONDS_PER_SECOND);
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutesWithinHour = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) {
    return `${pad(totalMinutes)}:${pad(seconds)}`;
  }
  return `${hours}h${pad(minutesWithinHour)}:${pad(seconds)}`;
}

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function indexPunches(
  punches: readonly LoopPunch[],
): (runnerSlug: string, loopIndex: number) => LoopPunch | undefined {
  const byKey = new Map<string, LoopPunch>();
  for (const punch of punches) {
    if (punch.voidedAt !== null) continue;
    byKey.set(`${punch.runnerSlug} ${punch.loopIndex}`, punch);
  }
  return (runnerSlug, loopIndex) => byKey.get(`${runnerSlug} ${loopIndex}`);
}

/**
 * Render the per-loop CSV: one header row, one row per ranked runner.
 *
 * Columns: `bib,runner_slug,display_name,B1,B2,...,B<totalHourlyTops>`.
 * Each `B<n>` cell carries the formatted loop duration, or empty when no
 * valid punch exists for that runner/loop. A trailing newline closes the
 * body so the file is well-formed for Excel and `csvkit`.
 */
export function renderLapsCsv(
  edition: RaceEdition,
  ranked: readonly RankedRunner[],
  punches: readonly LoopPunch[],
): string {
  const loopCount = totalHourlyTops(edition);
  const loopColumns = Array.from({ length: loopCount }, (_, index) => `B${index + 1}`);
  const headerColumns = ['bib', 'runner_slug', 'display_name', ...loopColumns];
  const lookupPunch = indexPunches(punches);

  const rows = ranked.map((entry) => {
    const cells: string[] = [
      entry.runner.bib === null ? '' : `${entry.runner.bib}`,
      entry.runner.slug,
      escapeCsvField(entry.runner.displayName),
    ];
    for (let loopIndex = 1; loopIndex <= loopCount; loopIndex += 1) {
      const punch = lookupPunch(entry.runner.slug, loopIndex);
      cells.push(punch === undefined ? '' : formatLoopDuration(loopDurationMs(edition, punch)));
    }
    return cells.join(',');
  });

  return `${headerColumns.join(',')}\n${rows.join('\n')}\n`;
}
