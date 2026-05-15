/**
 * Tiny factories for back-e2e tests. They produce in-memory shapes the
 * services can consume directly, or insert into the testcontainer Postgres
 * via the repository functions.
 */

import { randomUUID } from 'node:crypto';
import type { RaceEdition } from '../api/src/edition/edition.types';
import type { LoopPunch } from '../api/src/punch/punch.types';
import type { Runner } from '../api/src/runner/runner.types';

export function makeEdition(overrides: Partial<RaceEdition> = {}): RaceEdition {
  return {
    slug: 'lepin-2026',
    displayName: 'Last Loop Lépin 2026',
    startsAt: new Date('2026-09-19T06:00:00+02:00'),
    endsAt: new Date('2026-09-19T22:00:00+02:00'),
    sunriseAt: new Date('2026-09-19T07:15:00+02:00'),
    sunsetAt: new Date('2026-09-19T19:45:00+02:00'),
    intervalMinutes: 60,
    gpx: {
      distanceMeters: 5_800,
      elevationGainMeters: 250,
      trackJson: { points: [{ lat: 45.55, lng: 5.78 }] },
      startLatLng: { lat: 45.55, lng: 5.78 },
    },
    status: 'live',
    ...overrides,
  };
}

export function makeRunner(slug: string, overrides: Partial<Runner> = {}): Runner {
  return {
    editionSlug: 'lepin-2026',
    slug,
    displayName: slug[0]?.toUpperCase() + slug.slice(1),
    photoKey: null,
    bib: null,
    ...overrides,
  };
}

export function makePunch(
  runnerSlug: string,
  loopIndex: number,
  finishedAtIso: string,
  overrides: Partial<LoopPunch> = {},
): LoopPunch {
  return {
    id: randomUUID(),
    editionSlug: 'lepin-2026',
    runnerSlug,
    loopIndex,
    finishedAt: new Date(finishedAtIso),
    correctedAt: null,
    voidedAt: null,
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
    ...overrides,
  };
}
