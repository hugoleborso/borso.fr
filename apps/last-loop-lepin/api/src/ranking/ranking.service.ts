export { EditionNotFoundError } from '../edition/edition.service';

import type { Database } from '../database/client';
import { getEdition } from '../edition/edition.service';
import { getPunchesForEdition } from '../punch/punch.service';
import { listManualDnfsForEdition } from '../punch/punch.repository';
import { readPhotosCdnHost, toRunnerDto } from '../runner/runner.dto.utils';
import { listRunners } from '../runner/runner.service';
import {
  computeStandings,
  formatStandingsAsCsv,
  mostRecentCorrectionAt,
} from './ranking.core';
import type { RankedRunner, Standings } from './ranking.types';
import type { RunnerDto } from '../runner/runner.dto.utils';

export type RankedRunnerWithDto = Omit<RankedRunner, 'runner'> & { readonly runner: RunnerDto };

export interface SpectatorStandings {
  readonly standings: Omit<Standings, 'ranked'> & { readonly ranked: ReadonlyArray<RankedRunnerWithDto> };
  readonly mostRecentCorrectionAt: string | null;
}

export async function computeStandingsForEdition(
  database: Database,
  editionSlug: string,
  now: Date,
): Promise<Standings> {
  const edition = await getEdition(database, editionSlug);
  const [runners, punches, manualDnfs] = await Promise.all([
    listRunners(database, editionSlug),
    getPunchesForEdition(database, editionSlug),
    listManualDnfsForEdition(database, editionSlug),
  ]);
  return computeStandings(edition, runners, punches, manualDnfs, now);
}

export async function getSpectatorStandings(
  database: Database,
  editionSlug: string,
  now: Date,
): Promise<SpectatorStandings> {
  const [standings, punches] = await Promise.all([
    computeStandingsForEdition(database, editionSlug, now),
    getPunchesForEdition(database, editionSlug),
  ]);
  const cdnHost = readPhotosCdnHost();
  const rankedWithDto: ReadonlyArray<RankedRunnerWithDto> = standings.ranked.map((entry) => ({
    ...entry,
    runner: toRunnerDto(entry.runner, cdnHost),
  }));
  const correctionAt = mostRecentCorrectionAt(punches);
  return {
    standings: { ...standings, ranked: rankedWithDto },
    mostRecentCorrectionAt: correctionAt?.toISOString() ?? null,
  };
}

export async function getStandingsCsv(
  database: Database,
  editionSlug: string,
  now: Date,
): Promise<string> {
  const standings = await computeStandingsForEdition(database, editionSlug, now);
  return formatStandingsAsCsv(standings);
}
