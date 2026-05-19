import type { Database } from '../database/client';
import { listPunchesForEdition } from '../punch/punch.repository';
import type { LoopPunch } from '../punch/punch.types';
import { readPhotosCdnHost, toRunnerDto, type RunnerDto } from './runner.dto.utils';
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

export async function createRunnerAsDto(database: Database, input: CreateRunnerInput): Promise<RunnerDto> {
  const runner = await createRunner(database, input);
  return toRunnerDto(runner, readPhotosCdnHost());
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

export async function listRunnersAsDto(
  database: Database,
  editionSlug: string,
): Promise<ReadonlyArray<RunnerDto>> {
  const cdnHost = readPhotosCdnHost();
  const runners = await listRunnersForEdition(database, editionSlug);
  return runners.map((runner) => toRunnerDto(runner, cdnHost));
}

export async function getRunnerAsDto(
  database: Database,
  editionSlug: string,
  runnerSlug: string,
): Promise<RunnerDto> {
  const runner = await getRunner(database, editionSlug, runnerSlug);
  return toRunnerDto(runner, readPhotosCdnHost());
}

export async function listPunchesForRunner(
  database: Database,
  editionSlug: string,
  runnerSlug: string,
): Promise<readonly LoopPunch[]> {
  const allPunches = await listPunchesForEdition(database, editionSlug);
  return allPunches
    .filter((punch) => punch.runnerSlug === runnerSlug)
    .toSorted((left, right) => left.loopIndex - right.loopIndex);
}
