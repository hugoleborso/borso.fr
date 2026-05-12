import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { signAdminSession } from '../auth/auth.jwt';
import { insertEdition } from '../edition/edition.repository';
import { insertRunner } from '../runner/runner.repository';
import { makeEdition, makeRunner } from '../../../test/fixtures';

const punchResponseSchema = z.object({
  punch: z.object({
    id: z.string(),
    loopIndex: z.number(),
    finishedAt: z.string(),
    correctedAt: z.string().nullable(),
    voidedAt: z.string().nullable(),
  }),
});

const conflictResponseSchema = z.object({
  error: z.string(),
  punch: z.object({ id: z.string() }),
});

describe('admin punch controller', () => {
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

  async function adminCookie(): Promise<string> {
    const secret = process.env.JWT_SECRET ?? 'unset';
    const token = await signAdminSession(secret, new Date());
    return `lastloop_admin=${token}`;
  }

  async function postPunch(body: { editionSlug: string; runnerSlug: string }, cookie: string) {
    return app.request('/api/admin/punches', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(body),
    });
  }

  it('persists a punch and returns it at 201', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const cookie = await adminCookie();
    const response = await postPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, cookie);
    expect(response.status).toBe(201);
    const body = punchResponseSchema.parse(await response.json());
    expect(body.punch.loopIndex).toBe(1);
    expect(body.punch.voidedAt).toBeNull();
  });

  it('returns 409 when the same runner tries to punch the same loop twice', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const cookie = await adminCookie();
    const first = await postPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, cookie);
    expect(first.status).toBe(201);
    const second = await postPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, cookie);
    expect(second.status).toBe(409);
    const body = conflictResponseSchema.parse(await second.json());
    expect(body.punch.id).toBeTruthy();
  });

  it('refuses to register a punch without admin cookie', async () => {
    const response = await app.request('/api/admin/punches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }),
    });
    expect(response.status).toBe(401);
  });

  it('corrects a punch (sets corrected_at)', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const cookie = await adminCookie();
    const created = await postPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, cookie);
    const createdBody = punchResponseSchema.parse(await created.json());

    vi.setSystemTime(new Date('2026-09-19T06:35:00+02:00'));
    const correctedAtIso = '2026-09-19T06:33:00+02:00';
    const corrected = await app.request(`/api/admin/punches/${createdBody.punch.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ finishedAt: correctedAtIso }),
    });
    expect(corrected.status).toBe(200);
    const correctedBody = punchResponseSchema.parse(await corrected.json());
    expect(correctedBody.punch.finishedAt).toBe(new Date(correctedAtIso).toISOString());
    expect(correctedBody.punch.correctedAt).not.toBeNull();
  });

  it('voids a punch (sets voided_at)', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const cookie = await adminCookie();
    const created = await postPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, cookie);
    const createdBody = punchResponseSchema.parse(await created.json());

    vi.setSystemTime(new Date('2026-09-19T06:40:00+02:00'));
    const voided = await app.request(`/api/admin/punches/${createdBody.punch.id}`, {
      method: 'DELETE',
      headers: { cookie },
    });
    expect(voided.status).toBe(200);
    const voidedBody = punchResponseSchema.parse(await voided.json());
    expect(voidedBody.punch.voidedAt).not.toBeNull();
  });

  it('records a manual DNF', async () => {
    vi.setSystemTime(new Date('2026-09-19T08:00:00+02:00'));
    const cookie = await adminCookie();
    const response = await app.request('/api/admin/dnfs', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        outAtLoop: 2,
        reason: 'manual',
      }),
    });
    expect(response.status).toBe(201);
  });
});
