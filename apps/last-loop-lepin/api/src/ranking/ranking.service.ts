// @FollowsBlueprint service-facade-reexport
export { EditionNotFoundError } from '../edition/edition.service';

import { getEdition } from '../edition/edition.service';
import { listEditionPunches, listManualDidNotFinishes } from '../punch/punch.service';
import type { RunnerDto } from '../runner/runner.dto.utils';
import { toRunnerDto } from '../runner/runner.dto.utils';
import { readPhotosCdnHost } from '../runner/runner.environment';
import { listRunners } from '../runner/runner.service';
import { renderLapsCsv } from './laps-csv.core';
import { computeStandings, formatStandingsAsCsv, mostRecentCorrectionAt } from './ranking.core';
import type { RankedRunner, Standings } from './ranking.types';

export type RankedRunnerWithDto = Omit<RankedRunner, 'runner'> & { readonly runner: RunnerDto };

export interface SpectatorStandings {
  readonly standings: Omit<Standings, 'ranked'> & {
    readonly ranked: readonly RankedRunnerWithDto[];
  };
  readonly mostRecentCorrectionAt: string | null;
}

/**
 * @Blueprint service-read-model
 * @BlueprintName Service Read Model
 * @BlueprintUsage Use for a query that assembles a view from several tables. Read everything, then let one pure function decide the shape.
 * @BlueprintDescription Fetches the edition first because the rest depends on it, then reads runners, punches and did-not-finish rows in a single `Promise.all`, and hands all four plus `now` to `computeStandings`. Nothing is written and no ordering or ranking rule lives here, so the whole projection stays testable without a database.
 */
export async function computeStandingsForEdition(
  editionSlug: string,
  now: Date,
): Promise<Standings> {
  const edition = await getEdition(editionSlug);
  const [runners, punches, manualDidNotFinishes] = await Promise.all([
    listRunners(editionSlug),
    listEditionPunches(editionSlug),
    listManualDidNotFinishes(editionSlug),
  ]);
  return computeStandings({ edition, runners, punches, manualDidNotFinishes, now });
}

// @FollowsBlueprint service-dto-mapping
export async function getSpectatorStandings(
  editionSlug: string,
  now: Date,
): Promise<SpectatorStandings> {
  const [standings, punches] = await Promise.all([
    computeStandingsForEdition(editionSlug, now),
    listEditionPunches(editionSlug),
  ]);
  const cdnHost = readPhotosCdnHost();
  const rankedWithDto: readonly RankedRunnerWithDto[] = standings.ranked.map((entry) => ({
    ...entry,
    runner: toRunnerDto(entry.runner, cdnHost),
  }));
  const correctionAt = mostRecentCorrectionAt(punches);
  return {
    standings: { ...standings, ranked: rankedWithDto },
    mostRecentCorrectionAt: correctionAt?.toISOString() ?? null,
  };
}

export async function getStandingsCsv(editionSlug: string, now: Date): Promise<string> {
  const standings = await computeStandingsForEdition(editionSlug, now);
  return formatStandingsAsCsv(standings);
}

// @FollowsBlueprint service-read-model
export async function getLapsCsv(editionSlug: string, now: Date): Promise<string> {
  const edition = await getEdition(editionSlug);
  const [standings, punches] = await Promise.all([
    computeStandingsForEdition(editionSlug, now),
    listEditionPunches(editionSlug),
  ]);
  return renderLapsCsv(edition, standings.ranked, punches);
}
