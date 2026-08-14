import { getPunchesForEdition } from '../punch/punch.service';
import type { LoopPunch } from '../punch/punch.types';
import { type RunnerDto, toRunnerDto } from './runner.dto.utils';
import { readPhotosCdnHost } from './runner.environment';
import { findRunner, insertRunner, listRunnersForEdition, upsertRunner } from './runner.repository';
import type { Runner } from './runner.types';

// @FollowsBlueprint named-domain-error
export class RunnerAlreadyExistsError extends Error {
  override readonly name = 'RunnerAlreadyExistsError';
}

// @FollowsBlueprint named-domain-error
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

export async function createRunnerAsDto(input: CreateRunnerInput): Promise<RunnerDto> {
  const runner = await createRunner(input);
  return toRunnerDto(runner, readPhotosCdnHost());
}

// @FollowsBlueprint service-orchestration
export async function createRunner(input: CreateRunnerInput): Promise<Runner> {
  const existing = await findRunner(input.editionSlug, input.slug);
  if (existing !== null) {
    throw new RunnerAlreadyExistsError(
      `runner "${input.slug}" already in edition "${input.editionSlug}"`,
    );
  }
  const runner: Runner = {
    editionSlug: input.editionSlug,
    slug: input.slug,
    displayName: input.displayName,
    photoKey: input.photoKey ?? null,
    bib: input.bib ?? null,
  };
  await insertRunner(runner);
  return runner;
}

export async function getRunner(editionSlug: string, runnerSlug: string): Promise<Runner> {
  const runner = await findRunner(editionSlug, runnerSlug);
  if (runner === null) {
    throw new RunnerNotFoundError(`runner "${runnerSlug}" not found in edition "${editionSlug}"`);
  }
  return runner;
}

export async function listRunners(editionSlug: string): Promise<readonly Runner[]> {
  return listRunnersForEdition(editionSlug);
}

/**
 * @Blueprint service-dto-mapping
 * @BlueprintName Service DTO Mapping
 * @BlueprintUsage Use for turning a list of domain rows into DTOs when the mapper needs a value the environment holds.
 * @BlueprintDescription Reads the CDN host once into a local before the map, then calls the pure `toRunnerDto` for each row with that host as an argument. The environment is read a single time per request instead of once per runner, and the mapper stays free of `process.env` so it keeps its full coverage gate.
 */
export async function listRunnersAsDto(editionSlug: string): Promise<readonly RunnerDto[]> {
  const cdnHost = readPhotosCdnHost();
  const runners = await listRunnersForEdition(editionSlug);
  return runners.map((runner) => toRunnerDto(runner, cdnHost));
}

export async function getRunnerAsDto(editionSlug: string, runnerSlug: string): Promise<RunnerDto> {
  const runner = await getRunner(editionSlug, runnerSlug);
  return toRunnerDto(runner, readPhotosCdnHost());
}

export async function listPunchesForRunner(
  editionSlug: string,
  runnerSlug: string,
): Promise<readonly LoopPunch[]> {
  const allPunches = await getPunchesForEdition(editionSlug);
  return allPunches
    .filter((punch) => punch.runnerSlug === runnerSlug)
    .toSorted((left, right) => left.loopIndex - right.loopIndex);
}

/**
 * Write a runner row unless the edition already carries that slug. Exposed
 * for the test seeding endpoint, which replays one roster on every fixture.
 */
export async function seedRunner(runner: Runner): Promise<void> {
  await upsertRunner(runner);
}
