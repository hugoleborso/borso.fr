/**
 * Back-e2e for /api/__test/seed. The flag-gate side is covered in
 * `../app.test.ts`; this file walks the happy path: an authenticated
 * caller hits the endpoint, the response counts match the fixture, and
 * a second call is idempotent (no row duplication).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const TEST_SEED_FLAG = 'PRAGMA_ALLOW_TEST_SEED';

const seedResponseSchema = z.object({
  fixture: z.literal('basic-band'),
  members: z.number(),
  instruments: z.number(),
  songs: z.number(),
  sessions: z.number(),
  setlistEntries: z.number(),
});

const songsListSchema = z.object({ songs: z.array(z.unknown()) });
const sessionsListSchema = z.object({ sessions: z.array(z.unknown()) });

describe('__test/seed (back-e2e)', () => {
  const originalFlag = process.env[TEST_SEED_FLAG];

  beforeAll(() => {
    process.env[TEST_SEED_FLAG] = '1';
  });

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env[TEST_SEED_FLAG];
    } else {
      process.env[TEST_SEED_FLAG] = originalFlag;
    }
  });

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects unauthenticated callers', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await app.request('http://localhost/api/__test/seed?fixture=basic-band', {
      method: 'POST',
    });
    expect(response.status).toBe(401);
  });

  it('rejects an unknown fixture name with 400', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/__test/seed?fixture=does-not-exist', {
      method: 'POST',
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('lays down the basic-band fixture and reports counts', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/__test/seed?fixture=basic-band', {
      method: 'POST',
      cookieHeader,
    });
    expect(response.status).toBe(200);
    const body = await readJson(response, seedResponseSchema);
    expect(body).toEqual({
      fixture: 'basic-band',
      members: 4,
      instruments: 3,
      songs: 6,
      sessions: 2,
      setlistEntries: 4,
    });

    const songs = await readJson(
      await jsonRequest(app, '/api/songs', { cookieHeader }),
      songsListSchema,
    );
    expect(songs.songs).toHaveLength(6);

    const sessions = await readJson(
      await jsonRequest(app, '/api/sessions', { cookieHeader }),
      sessionsListSchema,
    );
    expect(sessions.sessions).toHaveLength(2);
  });

  it('is idempotent — a second call wipes and re-seeds without duplicates', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/__test/seed?fixture=basic-band', {
      method: 'POST',
      cookieHeader,
    });
    await jsonRequest(app, '/api/__test/seed?fixture=basic-band', {
      method: 'POST',
      cookieHeader,
    });
    const songs = await readJson(
      await jsonRequest(app, '/api/songs', { cookieHeader }),
      songsListSchema,
    );
    expect(songs.songs).toHaveLength(6);
  });
});
