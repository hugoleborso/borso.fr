import type { Database } from '../database/client';
import { getEdition } from '../edition/edition.service';
import { listManualDnfsForEdition } from '../punch/punch.repository';
import { getPunchesForEdition } from '../punch/punch.service';
import { listRunners } from '../runner/runner.service';
import { computeStandings } from './ranking.core';
import type { Standings } from './ranking.types';

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
