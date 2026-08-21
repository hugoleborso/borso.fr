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
 * @Blueprint core-serializer
 * @BlueprintName Core Serializer
 * @BlueprintUsage Use for rendering a text format. Take the data as arguments, return the whole string, read nothing else.
 * @BlueprintDescription Builds the header from the edition's loop count, indexes the punches once into a lookup so the row loop stays linear, quotes only the free text field, and returns the document as a string. No file is written and no locale is read, so a test compares the return value to a literal.
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
