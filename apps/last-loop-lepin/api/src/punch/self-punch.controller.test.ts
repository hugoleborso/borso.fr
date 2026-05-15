import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { insertEdition } from '../edition/edition.repository';
import { insertRunner } from '../runner/runner.repository';
import { makeEdition, makeRunner } from '../../../test/fixtures';

const selfPunchResponseSchema = z.object({
  punch: z.object({
    id: z.string(),
    loopIndex: z.number(),
    source: z.literal('self'),
    clientLat: z.number(),
    clientLng: z.number(),
    distanceFromCenterM: z.number(),
    userAgent: z.string().nullable(),
  }),
});

// Geofence centre per makeEdition: { lat: 45.55, lng: 5.78 }. ~56 m offset.
const IN_ZONE_LAT = 45.5505;
const IN_ZONE_LNG = 5.78;
const OUT_OF_ZONE_LAT = 45.56;
const OUT_OF_ZONE_LNG = 5.78;
const TEST_USER_AGENT = 'Mozilla/5.0 (iPhone) AppleWebKit Test';

describe('self-punch controller (public, no admin middleware)', () => {
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
  });

  async function postSelfPunch(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
    return app.request('/api/self-punches', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': TEST_USER_AGENT, ...headers },
      body: JSON.stringify(body),
    });
  }

  it('persists a self-punch with source="self" and 201, no admin cookie required', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const response = await postSelfPunch({
      editionSlug: 'lepin-2026',
      runnerSlug: 'alice',
      clientLat: IN_ZONE_LAT,
      clientLng: IN_ZONE_LNG,
      clientAccuracyM: 9,
    });
    expect(response.status).toBe(201);
    const body = selfPunchResponseSchema.parse(await response.json());
    expect(body.punch.source).toBe('self');
    expect(body.punch.distanceFromCenterM).toBeLessThan(100);
    expect(body.punch.userAgent).toBe(TEST_USER_AGENT);
  });

  it('accepts a POST without geo coordinates (geofence removed)', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const response = await postSelfPunch({
      editionSlug: 'lepin-2026',
      runnerSlug: 'alice',
      clientLat: null,
      clientLng: null,
      clientAccuracyM: null,
    });
    expect(response.status).toBe(201);
    const body = selfPunchResponseSchema.parse(await response.json());
    expect(body.punch.source).toBe('self');
    expect(body.punch.distanceFromCenterM).toBeNull();
  });

  it('rejects with 400 race-not-started before the race starts', async () => {
    vi.setSystemTime(new Date('2026-09-19T05:30:00+02:00'));
    const response = await postSelfPunch({
      editionSlug: 'lepin-2026',
      runnerSlug: 'alice',
      clientLat: IN_ZONE_LAT,
      clientLng: IN_ZONE_LNG,
      clientAccuracyM: null,
    });
    expect(response.status).toBe(400);
    const body = z.object({ error: z.string() }).parse(await response.json());
    expect(body.error).toBe('race-not-started');
  });

  it('returns 409 when admin already punched the same loop', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    // Plant an admin punch via the same controller surface so the conflict is
    // observable end-to-end.
    const { signAdminSession } = await import('../auth/auth.jwt');
    const secret = process.env.JWT_SECRET ?? 'unset';
    const token = await signAdminSession(secret, new Date());
    const adminResponse = await app.request('/api/admin/punches', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `lastloop_admin=${token}`,
      },
      body: JSON.stringify({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }),
    });
    expect(adminResponse.status).toBe(201);

    const response = await postSelfPunch({
      editionSlug: 'lepin-2026',
      runnerSlug: 'alice',
      clientLat: IN_ZONE_LAT,
      clientLng: IN_ZONE_LNG,
      clientAccuracyM: null,
    });
    expect(response.status).toBe(409);
  });

  it('rejects bodies failing the zod schema with 400', async () => {
    const response = await postSelfPunch({
      editionSlug: 'lepin-2026',
      runnerSlug: 'alice',
      clientLat: 999,
      clientLng: IN_ZONE_LNG,
      clientAccuracyM: null,
    });
    expect(response.status).toBe(400);
  });
});
