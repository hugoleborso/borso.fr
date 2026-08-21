import { selectCurrentEdition } from '@domain/edition-selection.core';
import { type GpxTrack, parseGpx } from '../helpers/gpx/gpx.core';
import { computeSunriseSunset } from '../helpers/sun/sun.core';
import { clearEditionPunchHistoryWithin } from '../punch/punch.service';
import { clearEditionRoster } from '../runner/runner.service';
import {
  deleteEdition,
  findEditionBySlug,
  insertEdition,
  listEditions,
  updateEditionSetup,
  runInOneTransaction,
  updateEditionStatus,
  upsertEdition,
} from './edition.repository';
import type { GpxMetadata, RaceEdition } from './edition.types';

const DEFAULT_INTERVAL_MINUTES = 60;

function trackJsonOmittingAbsentSeries(track: GpxTrack): GpxMetadata['trackJson'] {
  const base: GpxMetadata['trackJson'] = { points: track.points };
  const withTimings: GpxMetadata['trackJson'] =
    track.pointTimeFractions === null
      ? base
      : { ...base, pointTimeFractions: track.pointTimeFractions };
  if (track.pointElevations === null) return withTimings;
  return { ...withTimings, pointElevations: track.pointElevations };
}

// @FollowsBlueprint named-domain-error
export class EditionAlreadyExistsError extends Error {
  override readonly name = 'EditionAlreadyExistsError';
}

// @FollowsBlueprint named-domain-error
export class EditionNotFoundError extends Error {
  override readonly name = 'EditionNotFoundError';
}

// @FollowsBlueprint named-domain-error
export class EditionNotInSetupError extends Error {
  override readonly name = 'EditionNotInSetupError';
}

/**
 * @Blueprint service-facade-reexport
 * @BlueprintName Service Facade Re-export
 * @BlueprintUsage Use for an error another module raises that the controller has to catch, so the controller still imports one module per slice.
 * @BlueprintDescription Re-exports the parser and calculator errors this service lets through, so `edition.controller.ts` catches `GpxParseError` and `SunCalculationError` from the slice's own service rather than importing from `helpers/gpx` and `helpers/sun` directly.
 */
export { GpxParseError } from '../helpers/gpx/gpx.core';
export { SunCalculationError } from '../helpers/sun/sun.core';

export interface CreateEditionInput {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly intervalMinutes?: number;
  readonly gpxXml: string;
}

// @FollowsBlueprint service-orchestration
export async function createEdition(input: CreateEditionInput): Promise<RaceEdition> {
  if (input.startsAt.getTime() >= input.endsAt.getTime()) {
    throw new Error('startsAt must precede endsAt');
  }
  const existing = await findEditionBySlug(input.slug);
  if (existing !== null) {
    throw new EditionAlreadyExistsError(`edition "${input.slug}" already exists`);
  }

  const track = parseGpx(input.gpxXml);
  const { sunriseAt, sunsetAt } = computeSunriseSunset(track.startLatLng, input.startsAt);

  const edition: RaceEdition = {
    slug: input.slug,
    displayName: input.displayName,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    sunriseAt,
    sunsetAt,
    intervalMinutes: input.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES,
    gpx: {
      distanceMeters: track.distanceMeters,
      elevationGainMeters: track.elevationGainMeters,
      trackJson: trackJsonOmittingAbsentSeries(track),
      startLatLng: track.startLatLng,
    },
    status: 'setup',
  };
  await insertEdition(edition);
  return edition;
}

export async function getEdition(slug: string): Promise<RaceEdition> {
  const edition = await findEditionBySlug(slug);
  if (edition === null) throw new EditionNotFoundError(`edition "${slug}" not found`);
  return edition;
}

export async function getEditionOrNull(slug: string): Promise<RaceEdition | null> {
  return findEditionBySlug(slug);
}

export async function getAllEditions(): Promise<readonly RaceEdition[]> {
  return listEditions();
}

export interface CreateEditionFromIsoInput {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes?: number;
  readonly gpxXml: string;
}

export async function createEditionFromInput(
  input: CreateEditionFromIsoInput,
): Promise<RaceEdition> {
  return createEdition({
    slug: input.slug,
    displayName: input.displayName,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    ...(input.intervalMinutes === undefined ? {} : { intervalMinutes: input.intervalMinutes }),
    gpxXml: input.gpxXml,
  });
}

export interface ReplaceEditionFromIsoInput {
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes?: number;
  readonly gpxXml?: string;
}

export async function replaceEditionFromInput(
  slug: string,
  input: ReplaceEditionFromIsoInput,
): Promise<RaceEdition> {
  return replaceSetupEdition(slug, {
    displayName: input.displayName,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    ...(input.intervalMinutes === undefined ? {} : { intervalMinutes: input.intervalMinutes }),
    ...(input.gpxXml === undefined ? {} : { gpxXml: input.gpxXml }),
  });
}

export async function getCurrentEdition(): Promise<RaceEdition | null> {
  return selectCurrentEdition(await listEditions());
}

export async function transitionEditionStatus(
  slug: string,
  status: RaceEdition['status'],
): Promise<void> {
  const edition = await getEdition(slug);
  if (edition.status === status) return;
  await updateEditionStatus(slug, status);
}

export interface UpdateSetupEditionInput {
  readonly displayName: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly intervalMinutes?: number;
  readonly gpxXml?: string;
}

// @FollowsBlueprint service-orchestration
export async function replaceSetupEdition(
  slug: string,
  input: UpdateSetupEditionInput,
): Promise<RaceEdition> {
  if (input.startsAt.getTime() >= input.endsAt.getTime()) {
    throw new Error('startsAt must precede endsAt');
  }
  const existing = await getEdition(slug);
  if (existing.status !== 'setup') throw new EditionNotInSetupError(slug);
  const newTrack =
    input.gpxXml === undefined || input.gpxXml.length === 0 ? null : parseGpx(input.gpxXml);
  const startLatLng = newTrack?.startLatLng ?? existing.gpx.startLatLng;
  const { sunriseAt, sunsetAt } = computeSunriseSunset(startLatLng, input.startsAt);
  const replaced: RaceEdition = {
    ...existing,
    displayName: input.displayName,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    sunriseAt,
    sunsetAt,
    intervalMinutes: input.intervalMinutes ?? existing.intervalMinutes,
    gpx:
      newTrack === null
        ? existing.gpx
        : {
            distanceMeters: newTrack.distanceMeters,
            elevationGainMeters: newTrack.elevationGainMeters,
            trackJson: trackJsonOmittingAbsentSeries(newTrack),
            startLatLng: newTrack.startLatLng,
          },
  };
  await updateEditionSetup(slug, replaced);
  return replaced;
}

export async function removeSetupEdition(slug: string): Promise<void> {
  const existing = await getEdition(slug);
  if (existing.status !== 'setup') throw new EditionNotInSetupError(slug);
  await runInOneTransaction(async (executor) => {
    await clearEditionPunchHistoryWithin(executor, slug);
    await clearEditionRoster(executor, slug);
    await deleteEdition(executor, slug);
  });
}

export async function seedEdition(edition: RaceEdition): Promise<void> {
  await upsertEdition(edition);
}

export { computeSunriseSunset } from '../helpers/sun/sun.core';
