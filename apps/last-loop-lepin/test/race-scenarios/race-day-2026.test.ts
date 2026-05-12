/**
 * The race-day-2026 scenario — the test the spec calls out as the
 * motivation for `vi.setSystemTime()`. Rejoue une édition entière via
 * `vi.setSystemTime` + `app.request()`, sans HTTP réel.
 *
 * Requires the testcontainer Postgres booted by `test/setup-postgres.ts`.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../api/src/app';
import { findEditionBySlug, insertEdition } from '../../api/src/edition/edition.repository';
import { insertRunner } from '../../api/src/runner/runner.repository';
import { freshDatabase, truncateAllTables } from '../database-utils';
import { makeEdition, makeRunner } from '../fixtures';

const standingsEnvelopeSchema = z.object({
  standings: z.object({
    ranked: z.array(
      z.object({
        runner: z.object({ slug: z.string() }),
        status: z.object({ kind: z.string() }),
      }),
    ),
  }),
});

const EDITION_SLUG = 'lepin-2026';
const RUNNERS = ['alice', 'bob', 'carla', 'dan', 'eve', 'fred', 'gina', 'hugo'];

function setHourLocal(hour: number, minute: number): void {
  vi.setSystemTime(
    new Date(`2026-09-19T${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}:00+02:00`),
  );
}

describe('race day 2026 — end-to-end', () => {
  const app = createApp();

  beforeAll(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
  });

  it('seeds the edition + 8 runners the day before', async () => {
    setHourLocal(5, 30);
    const database = freshDatabase();
    await insertEdition(database, makeEdition({ status: 'setup' }));
    for (const slug of RUNNERS) await insertRunner(database, makeRunner(slug));

    const stored = await findEditionBySlug(database, EDITION_SLUG);
    expect(stored?.slug).toBe(EDITION_SLUG);
  });

  it('returns the empty standings before any punch', async () => {
    setHourLocal(5, 30);
    const database = freshDatabase();
    await insertEdition(database, makeEdition({ status: 'live' }));
    for (const slug of RUNNERS) await insertRunner(database, makeRunner(slug));

    setHourLocal(6, 30);
    const response = await app.request(`/api/standings/${EDITION_SLUG}`);
    expect(response.status).toBe(200);
    const body = standingsEnvelopeSchema.parse(await response.json());
    expect(body.standings.ranked).toHaveLength(RUNNERS.length);
  });

  it('marks late runners DNF after the second hourly top', async () => {
    const database = freshDatabase();
    await insertEdition(database, makeEdition({ status: 'live' }));
    for (const slug of RUNNERS) await insertRunner(database, makeRunner(slug));

    setHourLocal(7, 1);
    const response = await app.request(`/api/standings/${EDITION_SLUG}`);
    const body = standingsEnvelopeSchema.parse(await response.json());
    const dnfSlugs = body.standings.ranked
      .filter((entry) => entry.status.kind === 'dnf')
      .map((entry) => entry.runner.slug);
    expect(dnfSlugs).toEqual(expect.arrayContaining(RUNNERS));
  });

  it('exposes a healthy /api/health regardless of database state', async () => {
    setHourLocal(8, 0);
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
