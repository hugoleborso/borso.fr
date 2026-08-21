import { randomUUID } from 'node:crypto';
import { computeSunriseSunset, seedEdition } from '../edition/edition.service';
import type { RaceEdition } from '../edition/edition.types';
import {
  clearEditionPunchHistory,
  seedManualDidNotFinish,
  seedPunch,
} from '../punch/punch.service';
import { listRunners, seedRunner } from '../runner/runner.service';
import { planSeedFixture, type SeedEditionWindow, type SeedFixtureName } from './test-seed.core';

const EDITION_SLUG = 'lepin-2026';
const EDITION_NAME = 'Last Loop Lépin 2026';
const LOOP_INTERVAL_MINUTES = 60;

const SAMPLE_RUNNERS: readonly { slug: string; displayName: string; bib: number }[] = [
  { slug: 'alice', displayName: 'Alice', bib: 1 },
  { slug: 'bob', displayName: 'Bob', bib: 2 },
  { slug: 'carla', displayName: 'Carla', bib: 3 },
  { slug: 'dan', displayName: 'Dan', bib: 4 },
];

const SAMPLE_START_LATLNG = { lat: 45.55, lng: 5.78 };
const SAMPLE_GPX = {
  distanceMeters: 5_800,
  elevationGainMeters: 250,
  trackJson: {
    points: [
      { lat: 45.55, lng: 5.78 },
      { lat: 45.555, lng: 5.785 },
      { lat: 45.56, lng: 5.79 },
      { lat: 45.555, lng: 5.795 },
      { lat: 45.55, lng: 5.78 },
    ],
  },
  startLatLng: SAMPLE_START_LATLNG,
};

function buildFixtureEdition(raceWindow: SeedEditionWindow): RaceEdition {
  const { sunriseAt, sunsetAt } = computeSunriseSunset(SAMPLE_START_LATLNG, raceWindow.startsAt);
  return {
    slug: EDITION_SLUG,
    displayName: EDITION_NAME,
    startsAt: raceWindow.startsAt,
    endsAt: raceWindow.endsAt,
    sunriseAt,
    sunsetAt,
    intervalMinutes: LOOP_INTERVAL_MINUTES,
    gpx: SAMPLE_GPX,
    status: raceWindow.status,
  };
}

export interface SeedResult {
  readonly fixture: SeedFixtureName;
  readonly editionSlug: string;
  readonly runnerCount: number;
}

// @FollowsBlueprint service-orchestration
export async function applySeedFixture(fixture: SeedFixtureName, now: Date): Promise<SeedResult> {
  const plan = planSeedFixture(fixture, now);

  await clearEditionPunchHistory(EDITION_SLUG);
  await seedEdition(buildFixtureEdition(plan.raceWindow));

  for (const sample of SAMPLE_RUNNERS) {
    await seedRunner({
      editionSlug: EDITION_SLUG,
      slug: sample.slug,
      displayName: sample.displayName,
      photoKey: null,
      bib: sample.bib,
    });
  }

  for (const punch of plan.punches) {
    await seedPunch({
      id: randomUUID(),
      editionSlug: EDITION_SLUG,
      runnerSlug: punch.runnerSlug,
      loopIndex: punch.loopIndex,
      finishedAt: punch.finishedAt,
      correctedAt: null,
      voidedAt: null,
      source: 'admin',
      clientLat: null,
      clientLng: null,
      clientAccuracyM: null,
      distanceFromCenterM: null,
      userAgent: null,
    });
  }

  for (const didNotFinish of plan.didNotFinishes) {
    await seedManualDidNotFinish({
      editionSlug: EDITION_SLUG,
      runnerSlug: didNotFinish.runnerSlug,
      outAtLoop: didNotFinish.outAtLoop,
      reason: didNotFinish.reason,
      decidedAt: didNotFinish.decidedAt,
    });
  }

  const runners = await listRunners(EDITION_SLUG);
  return { fixture, editionSlug: EDITION_SLUG, runnerCount: runners.length };
}
