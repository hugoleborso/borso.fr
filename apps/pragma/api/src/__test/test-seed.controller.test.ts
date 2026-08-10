/**
 * Back-e2e for the test-seed endpoint. Asserts the fixture lands a
 * coherent dataset, that re-seeding replaces rather than appends, and
 * that the route is mounted ONLY when `ALLOW_TEST_SEED='1'` — the
 * security guard that keeps it off prod.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { createApp } from '../app';
import { listInstruments } from '../instruments/instruments.repository';
import { listMembers } from '../members/members.repository';
import { listSessions } from '../sessions/sessions.repository';
import { findSetlistBySession, listEntries } from '../setlists/setlists.repository';
import { listSongsNewestFirst } from '../songs/songs.repository';

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';
const SEED_ADMIN_PASSWORD = 'pragma-preview';

const summarySchema = z.object({
  instruments: z.number(),
  members: z.number(),
  songs: z.number(),
  setlistEntries: z.number(),
  adminPassword: z.string(),
  adminCredentials: z.enum(['created', 'already-set']),
});

async function postSeed(): Promise<Response> {
  return createApp().request('/api/__test/seed', { method: 'POST' });
}

async function postLogin(password: string): Promise<Response> {
  return createApp().request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

describe('__test/test-seed.controller (back-e2e)', () => {
  const originalFlag = process.env[TEST_SEED_FLAG];

  beforeAll(() => {
    process.env[TEST_SEED_FLAG] = '1';
  });

  afterAll(() => {
    if (originalFlag === undefined) delete process.env[TEST_SEED_FLAG];
    else process.env[TEST_SEED_FLAG] = originalFlag;
  });

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('seeds a coherent fixture (instruments, members, songs, setlist)', async () => {
    const response = await postSeed();
    expect(response.status).toBe(200);
    const summary = summarySchema.parse(await response.json());
    expect(summary).toEqual({
      instruments: 5,
      members: 4,
      songs: 6,
      setlistEntries: 6,
      adminPassword: SEED_ADMIN_PASSWORD,
      adminCredentials: 'created',
    });

    expect((await listInstruments()).length).toBe(5);
    expect((await listMembers()).length).toBe(4);

    const songs = await listSongsNewestFirst();
    expect(songs.length).toBe(6);
    expect(songs.every((song) => song.baseEnergy !== null)).toBe(true);

    const sessions = await listSessions();
    expect(sessions.length).toBe(1);
    const sessionId = sessions[0]?.id;
    expect(sessionId).toBeDefined();
    if (sessionId === undefined) return;
    const setlist = await findSetlistBySession(sessionId);
    expect(setlist).not.toBeNull();
    if (setlist === null) return;
    const entries = await listEntries(setlist.id);
    expect(entries.length).toBe(6);
    expect(entries.every((entry) => entry.energy === null)).toBe(true);
  });

  it('bootstraps the admin password so the seeded preview is loginable', async () => {
    await postSeed();
    const loginResponse = await postLogin(SEED_ADMIN_PASSWORD);
    expect(loginResponse.status).toBe(200);
  });

  it('is idempotent — re-seeding replaces rather than appends', async () => {
    await postSeed();
    await postSeed();
    expect((await listSongsNewestFirst()).length).toBe(6);
  });

  it('is not mounted when ALLOW_TEST_SEED is unset', async () => {
    const saved = process.env[TEST_SEED_FLAG];
    delete process.env[TEST_SEED_FLAG];
    try {
      const response = await postSeed();
      expect(response.status).toBe(404);
    } finally {
      if (saved !== undefined) process.env[TEST_SEED_FLAG] = saved;
    }
  });
});
