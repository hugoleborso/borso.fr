/**
 * Test-only seeding endpoints. Mounted by `app.ts` ONLY when
 * `LASTLOOP_ALLOW_TEST_SEED === '1'`. CDK never sets that flag on the
 * prod stack (asserted in `cdk/lib/stack.test.ts`).
 *
 * Timestamps are computed relative to `new Date()` so the seeded
 * fixtures stay coherent with the live wall-clock — without that, the
 * back-end's `validatePunchTiming` rejects punches because the race
 * window (hard-coded date) is months away from "now".
 */

import { randomUUID } from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import {
  findEditionBySlug,
  insertEdition,
  updateEditionStatus,
} from '../edition/edition.repository';
import { editionsTable } from '../edition/edition.schema';
import type { RaceEdition } from '../edition/edition.types';
import { computeSunriseSunset } from '../helpers/sun/sun.core';
import { insertManualDnf, insertPunch } from '../punch/punch.repository';
import { insertRunner, listRunnersForEdition } from '../runner/runner.repository';
import type { Runner } from '../runner/runner.types';

const EDITION_SLUG = 'lepin-2026';
const EDITION_NAME = 'Last Loop Lépin 2026';
const LOOP_INTERVAL_MINUTES = 60;
const HOUR_MS = 60 * 60 * 1000;

const SAMPLE_RUNNERS: ReadonlyArray<{ slug: string; displayName: string; bib: number }> = [
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

interface EditionWindow {
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: 'setup' | 'live' | 'finished';
}

function buildEdition(_now: Date, window: EditionWindow): RaceEdition {
  const { sunriseAt, sunsetAt } = computeSunriseSunset(SAMPLE_START_LATLNG, window.startsAt);
  return {
    slug: EDITION_SLUG,
    displayName: EDITION_NAME,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    sunriseAt,
    sunsetAt,
    intervalMinutes: LOOP_INTERVAL_MINUTES,
    gpx: SAMPLE_GPX,
    status: window.status,
  };
}

function alignedToTopOfHour(date: Date, offsetHours: number): Date {
  const cursor = new Date(date.getTime() + offsetHours * HOUR_MS);
  cursor.setMinutes(0, 0, 0);
  return cursor;
}

const fixtureSchema = z.object({
  fixture: z.enum(['race-mid-loop-3', 'race-finished', 'top-with-dnf-candidates']),
});

const testSeedRouter = new Hono();

async function clearEditionRows(): Promise<void> {
  // Reset punches + DNFs scoped to our seeded edition before each fixture
  // applies its own. Without this, switching between fixtures (e.g.
  // race-finished → race-mid-loop-3) leaves stale punches from the previous
  // run and the standings drift into nonsense (visual-validation #25).
  const database = getDatabase();
  await database.execute(
    sql`DELETE FROM loop_punches WHERE edition_slug = ${EDITION_SLUG}`,
  );
  await database.execute(
    sql`DELETE FROM manual_dnfs WHERE edition_slug = ${EDITION_SLUG}`,
  );
}

async function ensureEditionAndRunners(now: Date, window: EditionWindow): Promise<void> {
  const database = getDatabase();
  await clearEditionRows();
  const existing = await findEditionBySlug(database, EDITION_SLUG);
  if (existing === null) {
    await insertEdition(database, buildEdition(now, window));
  } else {
    // Edition exists from a previous seed; align its window + status to the
    // current fixture by writing fresh timestamps via the Drizzle update
    // builder (postgres-js's raw template literal rejects Date objects).
    const { sunriseAt, sunsetAt } = buildEdition(now, window);
    await database
      .update(editionsTable)
      .set({
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        sunriseAt,
        sunsetAt,
        status: window.status,
      })
      .where(eq(editionsTable.slug, EDITION_SLUG));
    await updateEditionStatus(database, EDITION_SLUG, window.status);
  }
  const existingRunners = await listRunnersForEdition(database, EDITION_SLUG);
  const existingSlugs = new Set(existingRunners.map((entry) => entry.slug));
  for (const seed of SAMPLE_RUNNERS) {
    if (existingSlugs.has(seed.slug)) continue;
    const runner: Runner = {
      editionSlug: EDITION_SLUG,
      slug: seed.slug,
      displayName: seed.displayName,
      photoKey: null,
      bib: seed.bib,
    };
    await insertRunner(database, runner);
  }
}

async function ensurePunch(runnerSlug: string, loopIndex: number, finishedAt: Date): Promise<void> {
  // Always insert — `clearEditionRows` ran in `ensureEditionAndRunners`, so
  // there is no duplicate to dedupe against.
  await insertPunch(getDatabase(), {
    id: randomUUID(),
    editionSlug: EDITION_SLUG,
    runnerSlug,
    loopIndex,
    finishedAt,
    correctedAt: null,
    voidedAt: null,
  });
}

async function ensureManualDnf(
  runnerSlug: string,
  outAtLoop: number,
  reason: 'late' | 'manual',
  decidedAt: Date,
): Promise<void> {
  await insertManualDnf(getDatabase(), {
    editionSlug: EDITION_SLUG,
    runnerSlug,
    outAtLoop,
    reason,
    decidedAt,
  });
}

async function applyRaceMidLoop3(now: Date): Promise<void> {
  // Race started 3 hours ago, runs for 16h. Currently mid loop 4.
  const startsAt = alignedToTopOfHour(now, -3);
  const endsAt = new Date(startsAt.getTime() + 16 * HOUR_MS);
  await ensureEditionAndRunners(now, { startsAt, endsAt, status: 'live' });
  // Alice has 3 valid punches (loops 1, 2, 3). Bob has 2 (1, 2). Carla 1 (1). Dan dropped after loop 1.
  await ensurePunch('alice', 1, new Date(startsAt.getTime() + 0.92 * HOUR_MS));
  await ensurePunch('alice', 2, new Date(startsAt.getTime() + 1.93 * HOUR_MS));
  await ensurePunch('alice', 3, new Date(startsAt.getTime() + 2.95 * HOUR_MS));
  await ensurePunch('bob', 1, new Date(startsAt.getTime() + 0.95 * HOUR_MS));
  await ensurePunch('bob', 2, new Date(startsAt.getTime() + 1.97 * HOUR_MS));
  await ensurePunch('carla', 1, new Date(startsAt.getTime() + 0.98 * HOUR_MS));
  await ensurePunch('dan', 1, new Date(startsAt.getTime() + 0.99 * HOUR_MS));
  await ensureManualDnf('dan', 1, 'late', new Date(startsAt.getTime() + 2 * HOUR_MS));
}

async function applyTopWithDnfCandidates(now: Date): Promise<void> {
  // Just past a top: loop 1 closed 2 minutes ago, loop 2 underway.
  // Alice + bob punched loop 1 in time. Carla + dan didn't — they're candidates.
  const startsAt = alignedToTopOfHour(now, -1);
  startsAt.setTime(startsAt.getTime() - 2 * 60_000);
  const endsAt = new Date(startsAt.getTime() + 16 * HOUR_MS);
  await ensureEditionAndRunners(now, { startsAt, endsAt, status: 'live' });
  await ensurePunch('alice', 1, new Date(startsAt.getTime() + 0.93 * HOUR_MS));
  await ensurePunch('bob', 1, new Date(startsAt.getTime() + 0.97 * HOUR_MS));
}

async function applyRaceFinished(now: Date): Promise<void> {
  // Race ran 16 hours, ended 5 minutes ago. Alice survived to loop 5; others DNFed earlier.
  const endsAt = new Date(now.getTime() - 5 * 60_000);
  const startsAt = new Date(endsAt.getTime() - 16 * HOUR_MS);
  await ensureEditionAndRunners(now, { startsAt, endsAt, status: 'finished' });
  for (let loopIndex = 1; loopIndex <= 5; loopIndex += 1) {
    await ensurePunch('alice', loopIndex, new Date(startsAt.getTime() + (loopIndex - 0.05) * HOUR_MS));
  }
  for (let loopIndex = 1; loopIndex <= 3; loopIndex += 1) {
    await ensurePunch('bob', loopIndex, new Date(startsAt.getTime() + (loopIndex - 0.1) * HOUR_MS));
  }
  await ensurePunch('carla', 1, new Date(startsAt.getTime() + 0.95 * HOUR_MS));
  await ensureManualDnf('bob', 3, 'late', new Date(startsAt.getTime() + 4 * HOUR_MS));
  await ensureManualDnf('carla', 1, 'late', new Date(startsAt.getTime() + 2 * HOUR_MS));
  await ensureManualDnf('dan', 0, 'manual', new Date(startsAt.getTime() + 0.5 * HOUR_MS));
}

testSeedRouter.post('/seed', zValidator('query', fixtureSchema), async (context) => {
  const { fixture } = context.req.valid('query');
  const now = new Date();
  if (fixture === 'race-mid-loop-3') await applyRaceMidLoop3(now);
  else if (fixture === 'top-with-dnf-candidates') await applyTopWithDnfCandidates(now);
  else await applyRaceFinished(now);

  const runners = await listRunnersForEdition(getDatabase(), EDITION_SLUG);
  return context.json({ fixture, edition: EDITION_SLUG, runners: runners.length });
});

export { testSeedRouter };
