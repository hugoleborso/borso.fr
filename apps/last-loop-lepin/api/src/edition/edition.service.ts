import { type GpxTrack, parseGpx } from '../helpers/gpx/gpx.core';
import { computeSunriseSunset } from '../helpers/sun/sun.core';
import type { Database } from '../database/client';
import {
  deleteEdition,
  findEditionBySlug,
  insertEdition,
  listEditions,
  updateEditionSetup,
  updateEditionStatus,
} from './edition.repository';
import type { GpxMetadata, RaceEdition } from './edition.types';

const DEFAULT_INTERVAL_MINUTES = 60;

/**
 * Build the persisted `trackJson` from a parser output. Centralises the
 * `null` (core boundary) → omitted-key (DTO / persisted JSON) translation
 * for `pointTimeFractions` — without this, `JSON.stringify` would emit
 * `"pointTimeFractions": null`, which the Zod refine on read would reject.
 */
function trackJsonOf(track: GpxTrack): GpxMetadata['trackJson'] {
  // Both `pointTimeFractions` and `pointElevations` follow the
  // `null` (core) → omitted-key (DTO) translation — emitting `null` would
  // round-trip through `JSON.stringify` as `"…": null` and trip the Zod
  // `.optional()` on read.
  const base: GpxMetadata['trackJson'] = { points: track.points };
  const withTimings: GpxMetadata['trackJson'] =
    track.pointTimeFractions === null
      ? base
      : { ...base, pointTimeFractions: track.pointTimeFractions };
  if (track.pointElevations === null) return withTimings;
  return { ...withTimings, pointElevations: track.pointElevations };
}

export class EditionAlreadyExistsError extends Error {
  override readonly name = 'EditionAlreadyExistsError';
}

export class EditionNotFoundError extends Error {
  override readonly name = 'EditionNotFoundError';
}

export class EditionNotInSetupError extends Error {
  override readonly name = 'EditionNotInSetupError';
}

export interface CreateEditionInput {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly intervalMinutes?: number;
  readonly gpxXml: string;
}

export async function createEdition(database: Database, input: CreateEditionInput): Promise<RaceEdition> {
  if (input.startsAt.getTime() >= input.endsAt.getTime()) {
    throw new Error('startsAt must precede endsAt');
  }
  const existing = await findEditionBySlug(database, input.slug);
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
      trackJson: trackJsonOf(track),
      startLatLng: track.startLatLng,
    },
    status: 'setup',
  };
  await insertEdition(database, edition);
  return edition;
}

export async function getEdition(database: Database, slug: string): Promise<RaceEdition> {
  const edition = await findEditionBySlug(database, slug);
  if (edition === null) throw new EditionNotFoundError(`edition "${slug}" not found`);
  return edition;
}

export async function getEditionOrNull(database: Database, slug: string): Promise<RaceEdition | null> {
  return findEditionBySlug(database, slug);
}

export async function getAllEditions(database: Database): Promise<readonly RaceEdition[]> {
  return listEditions(database);
}

export async function transitionEditionStatus(
  database: Database,
  slug: string,
  status: RaceEdition['status'],
): Promise<void> {
  const edition = await getEdition(database, slug);
  if (edition.status === status) return;
  await updateEditionStatus(database, slug, status);
}

export interface UpdateSetupEditionInput {
  readonly displayName: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly intervalMinutes?: number;
  /**
   * Omitted (or empty) → keep the persisted GPX + sunrise/sunset.
   * Provided → re-parse, recompute, replace. Empty strings are coerced
   * to `undefined` by the controller so the schema-side `.optional()`
   * + this branch agree.
   */
  readonly gpxXml?: string;
}

/**
 * Re-parses the GPX, recomputes sunrise/sunset, and writes every mutable
 * field on the existing edition row. Refused (with
 * {@link EditionNotInSetupError}) once the race has gone live — the
 * GPX + schedule are the contract the spectators see and shouldn't shift
 * mid-race. Slug is the primary key and never edits.
 */
export async function replaceSetupEdition(
  database: Database,
  slug: string,
  input: UpdateSetupEditionInput,
): Promise<RaceEdition> {
  if (input.startsAt.getTime() >= input.endsAt.getTime()) {
    throw new Error('startsAt must precede endsAt');
  }
  const existing = await getEdition(database, slug);
  if (existing.status !== 'setup') throw new EditionNotInSetupError(slug);
  const newTrack = input.gpxXml === undefined || input.gpxXml.length === 0
    ? null
    : parseGpx(input.gpxXml);
  // Sunrise/sunset depend on (a) the start coordinates and (b) the start
  // date. Re-compute whenever either changed — i.e. when the user uploaded
  // a new GPX OR shifted `startsAt`.
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
    gpx: newTrack === null
      ? existing.gpx
      : {
          distanceMeters: newTrack.distanceMeters,
          elevationGainMeters: newTrack.elevationGainMeters,
          trackJson: trackJsonOf(newTrack),
          startLatLng: newTrack.startLatLng,
        },
  };
  await updateEditionSetup(database, slug, replaced);
  return replaced;
}

export async function removeSetupEdition(database: Database, slug: string): Promise<void> {
  const existing = await getEdition(database, slug);
  if (existing.status !== 'setup') throw new EditionNotInSetupError(slug);
  await deleteEdition(database, slug);
}
