import type { Database } from '../database/client';
import {
  findRunner,
  insertRunner,
  listRunnersForEdition,
} from './runner.repository';
import type { Runner } from './runner.types';

export class RunnerAlreadyExistsError extends Error {
  override readonly name = 'RunnerAlreadyExistsError';
}

export class RunnerNotFoundError extends Error {
  override readonly name = 'RunnerNotFoundError';
}

export interface CreateRunnerInput {
  readonly editionSlug: string;
  readonly slug: string;
  readonly displayName: string;
  readonly photoKey?: string | null;
  readonly bib?: number | null;
}

export async function createRunner(database: Database, input: CreateRunnerInput): Promise<Runner> {
  const existing = await findRunner(database, input.editionSlug, input.slug);
  if (existing !== null) {
    throw new RunnerAlreadyExistsError(`runner "${input.slug}" already in edition "${input.editionSlug}"`);
  }
  const runner: Runner = {
    editionSlug: input.editionSlug,
    slug: input.slug,
    displayName: input.displayName,
    photoKey: input.photoKey ?? null,
    bib: input.bib ?? null,
  };
  await insertRunner(database, runner);
  return runner;
}

export async function getRunner(
  database: Database,
  editionSlug: string,
  runnerSlug: string,
): Promise<Runner> {
  const runner = await findRunner(database, editionSlug, runnerSlug);
  if (runner === null) {
    throw new RunnerNotFoundError(`runner "${runnerSlug}" not found in edition "${editionSlug}"`);
  }
  return runner;
}

export async function listRunners(database: Database, editionSlug: string): Promise<readonly Runner[]> {
  return listRunnersForEdition(database, editionSlug);
}
