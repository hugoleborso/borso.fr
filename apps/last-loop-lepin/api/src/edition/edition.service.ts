import { parseGpx } from '../helpers/gpx/gpx.core';
import { computeSunriseSunset } from '../helpers/sun/sun.core';
import type { Database } from '../database/client';
import {
  findEditionBySlug,
  insertEdition,
  listEditions,
  updateEditionStatus,
} from './edition.repository';
import type { RaceEdition } from './edition.types';

const DEFAULT_INTERVAL_MINUTES = 60;

export class EditionAlreadyExistsError extends Error {
  override readonly name = 'EditionAlreadyExistsError';
}

export class EditionNotFoundError extends Error {
  override readonly name = 'EditionNotFoundError';
}

export interface CreateEditionInput {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
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
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    gpx: {
      distanceMeters: track.distanceMeters,
      elevationGainMeters: track.elevationGainMeters,
      trackJson: { points: track.points },
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
