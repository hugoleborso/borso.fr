import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { insertEdition } from '../edition/edition.repository';
import { insertPunch } from '../punch/punch.repository';
import { insertRunner } from '../runner/runner.repository';
import { makeEdition, makePunch, makeRunner } from '../../../test/fixtures';

const standingsResponseSchema = z.object({
  standings: z.object({
    editionSlug: z.string(),
    raceEnded: z.boolean(),
    ranked: z.array(
      z.object({
        runner: z.object({ slug: z.string(), photoUrl: z.string().nullable() }),
        rank: z.union([z.number(), z.literal('ex-aequo')]),
        status: z.object({ kind: z.string() }),
        lastFinishedAt: z.string().nullable(),
      }),
    ),
    fastestLap: z.array(z.object({ runnerSlug: z.string(), durationMs: z.number() })),
  }),
});

describe('ranking controller', () => {
  const app = createApp();

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'live' }));
    await insertRunner(database, makeRunner('alice'));
    await insertRunner(database, makeRunner('bob'));
  });

  it('returns 404 on unknown edition', async () => {
    const response = await app.request('/api/standings/does-not-exist');
    expect(response.status).toBe(404);
  });

  it('returns 200 with cache headers and ranked array shape', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const response = await app.request('/api/standings/lepin-2026');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toMatch(/max-age=\d+/);
    const body = standingsResponseSchema.parse(await response.json());
    expect(body.standings.ranked).toHaveLength(2);
  });

  it('marks identical loop+time entries as ex-aequo after race end', async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'live' }));
    await insertRunner(database, makeRunner('alice'));
    await insertRunner(database, makeRunner('bob'));
    await insertPunch(database, makePunch('alice', 1, '2026-09-19T06:55:00.000+02:00'));
    await insertPunch(database, makePunch('bob', 1, '2026-09-19T06:55:00.000+02:00'));

    vi.setSystemTime(new Date('2026-09-19T22:30:00+02:00'));
    const response = await app.request('/api/standings/lepin-2026');
    const body = standingsResponseSchema.parse(await response.json());
    expect(body.standings.raceEnded).toBe(true);
    expect(body.standings.ranked.every((entry) => entry.rank === 'ex-aequo')).toBe(true);
  });

  it('puts late DNF runners after the survivors', async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'live' }));
    await insertRunner(database, makeRunner('alice'));
    await insertRunner(database, makeRunner('bob'));
    await insertPunch(database, makePunch('alice', 1, '2026-09-19T06:55:00+02:00'));
    await insertPunch(database, makePunch('alice', 2, '2026-09-19T07:55:00+02:00'));

    vi.setSystemTime(new Date('2026-09-19T08:30:00+02:00'));
    const response = await app.request('/api/standings/lepin-2026');
    const body = standingsResponseSchema.parse(await response.json());
    expect(body.standings.ranked[0]?.runner.slug).toBe('alice');
    expect(body.standings.ranked[0]?.status.kind).toBe('in-race');
    expect(body.standings.ranked[1]?.runner.slug).toBe('bob');
    expect(body.standings.ranked[1]?.status.kind).toBe('dnf');
  });

  it('exposes photoUrl on each ranked runner when PHOTOS_CDN_HOST is set', async () => {
    const savedCdnHost = process.env.PHOTOS_CDN_HOST;
    process.env.PHOTOS_CDN_HOST = 'photos-cdn.test.example';
    try {
      const database = freshDatabase();
      await truncateAllTables(database);
      await insertEdition(database, makeEdition({ status: 'live' }));
      await insertRunner(database, makeRunner('borso', { photoKey: 'lepin-2026/borso/x.jpg' }));
      vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
      const response = await app.request('/api/standings/lepin-2026');
      const body = standingsResponseSchema.parse(await response.json());
      expect(body.standings.ranked[0]?.runner.photoUrl).toBe(
        'https://photos-cdn.test.example/lepin-2026/borso/x.jpg',
      );
    } finally {
      if (savedCdnHost === undefined) {
        delete process.env.PHOTOS_CDN_HOST;
      } else {
        process.env.PHOTOS_CDN_HOST = savedCdnHost;
      }
    }
  });

  it('surfaces fastestLap on the response body and matches the seeded record holder', async () => {
    // Alice loop 1 = 55 min, Bob loop 1 = 58 min → Alice holds at 55 min.
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'live' }));
    await insertRunner(database, makeRunner('alice'));
    await insertRunner(database, makeRunner('bob'));
    await insertPunch(database, makePunch('alice', 1, '2026-09-19T06:55:00+02:00'));
    await insertPunch(database, makePunch('bob', 1, '2026-09-19T06:58:00+02:00'));

    vi.setSystemTime(new Date('2026-09-19T07:30:00+02:00'));
    const response = await app.request('/api/standings/lepin-2026');
    const body = standingsResponseSchema.parse(await response.json());
    expect(body.standings.fastestLap).toEqual([
      { runnerSlug: 'alice', durationMs: 55 * 60_000 },
    ]);
  });
});
