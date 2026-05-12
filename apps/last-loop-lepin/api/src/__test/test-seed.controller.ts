/**
 * Test-only seeding endpoints. Mounted by `app.ts` ONLY when
 * `LASTLOOP_ALLOW_TEST_SEED === '1'`. CDK never sets that flag on the
 * prod stack (asserted in `cdk/lib/stack.test.ts`).
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { listPunchesForEdition } from '../punch/punch.repository';
import { insertManualDnf, insertPunch } from '../punch/punch.repository';
import { listRunnersForEdition } from '../runner/runner.repository';
import { findEditionBySlug, insertEdition } from '../edition/edition.repository';
import { insertRunner } from '../runner/runner.repository';
import type { RaceEdition } from '../edition/edition.types';
import type { Runner } from '../runner/runner.types';

const fixtureSchema = z.object({
  fixture: z.enum(['race-mid-loop-3', 'race-finished', 'top-with-dnf-candidates']),
});

const SAMPLE_EDITION: RaceEdition = {
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
    trackJson: {
      points: [
        { lat: 45.55, lng: 5.78 },
        { lat: 45.555, lng: 5.785 },
        { lat: 45.56, lng: 5.79 },
      ],
    },
    startLatLng: { lat: 45.55, lng: 5.78 },
  },
  status: 'live',
};

const SAMPLE_RUNNERS: readonly Runner[] = [
  { editionSlug: 'lepin-2026', slug: 'alice', displayName: 'Alice', photoKey: null, bib: 1 },
  { editionSlug: 'lepin-2026', slug: 'bob', displayName: 'Bob', photoKey: null, bib: 2 },
  { editionSlug: 'lepin-2026', slug: 'carla', displayName: 'Carla', photoKey: null, bib: 3 },
];

const testSeedRouter = new Hono();

testSeedRouter.post('/seed', zValidator('query', fixtureSchema), async (context) => {
  const { fixture } = context.req.valid('query');
  const database = getDatabase();
  const existing = await findEditionBySlug(database, SAMPLE_EDITION.slug);
  if (existing === null) {
    await insertEdition(database, SAMPLE_EDITION);
    for (const runner of SAMPLE_RUNNERS) await insertRunner(database, runner);
  }
  if (fixture === 'race-mid-loop-3' || fixture === 'top-with-dnf-candidates') {
    const punches = await listPunchesForEdition(database, SAMPLE_EDITION.slug);
    if (punches.length === 0) {
      await insertPunch(database, {
        id: '11111111-1111-1111-1111-111111111111',
        editionSlug: SAMPLE_EDITION.slug,
        runnerSlug: 'alice',
        loopIndex: 1,
        finishedAt: new Date('2026-09-19T06:55:00+02:00'),
        correctedAt: null,
        voidedAt: null,
      });
      await insertPunch(database, {
        id: '22222222-2222-2222-2222-222222222222',
        editionSlug: SAMPLE_EDITION.slug,
        runnerSlug: 'alice',
        loopIndex: 2,
        finishedAt: new Date('2026-09-19T07:55:00+02:00'),
        correctedAt: null,
        voidedAt: null,
      });
    }
  }
  if (fixture === 'race-finished') {
    await insertManualDnf(database, {
      editionSlug: SAMPLE_EDITION.slug,
      runnerSlug: 'bob',
      outAtLoop: 1,
      reason: 'late',
      decidedAt: new Date('2026-09-19T07:01:00+02:00'),
    }).catch(() => undefined);
  }
  const runners = await listRunnersForEdition(database, SAMPLE_EDITION.slug);
  return context.json({ fixture, edition: SAMPLE_EDITION.slug, runners: runners.length });
});

export { testSeedRouter };
