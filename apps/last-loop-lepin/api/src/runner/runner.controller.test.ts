import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { signAdminSession } from '../auth/auth.jwt';
import { insertEdition } from '../edition/edition.repository';
import { makeEdition } from '../../../test/fixtures';

const runnerEnvelopeSchema = z.object({
  runner: z.object({
    editionSlug: z.string(),
    slug: z.string(),
    displayName: z.string(),
    photoKey: z.string().nullable(),
    bib: z.number().nullable(),
  }),
});

const runnersListSchema = z.object({
  runners: z.array(z.object({ slug: z.string(), displayName: z.string() })),
});

describe('runner controller', () => {
  const app = createApp();

  beforeEach(async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'setup' }));
  });

  async function adminCookie(): Promise<string> {
    const secret = process.env.JWT_SECRET ?? 'unset';
    const token = await signAdminSession(secret, new Date());
    return `lastloop_admin=${token}`;
  }

  it('creates a runner and surfaces it in the public list', async () => {
    const cookie = await adminCookie();
    const create = await app.request('/api/admin/runners', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        editionSlug: 'lepin-2026',
        slug: 'carla',
        displayName: 'Carla',
        bib: 3,
      }),
    });
    expect(create.status).toBe(201);
    runnerEnvelopeSchema.parse(await create.json());

    const list = await app.request('/api/editions/lepin-2026/runners');
    expect(list.status).toBe(200);
    const body = runnersListSchema.parse(await list.json());
    expect(body.runners.map((entry) => entry.slug)).toContain('carla');
  });

  it('returns 409 on duplicate slug for the same edition', async () => {
    const cookie = await adminCookie();
    const input = {
      editionSlug: 'lepin-2026',
      slug: 'dora',
      displayName: 'Dora',
    };
    const first = await app.request('/api/admin/runners', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(input),
    });
    expect(first.status).toBe(201);
    const second = await app.request('/api/admin/runners', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(input),
    });
    expect(second.status).toBe(409);
  });

  it('requires admin cookie for write endpoints but not for read', async () => {
    const noCookieWrite = await app.request('/api/admin/runners', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editionSlug: 'lepin-2026', slug: 'eve', displayName: 'Eve' }),
    });
    expect(noCookieWrite.status).toBe(401);

    const publicRead = await app.request('/api/editions/lepin-2026/runners');
    expect(publicRead.status).toBe(200);
  });

  it('returns 404 on unknown runner', async () => {
    const response = await app.request('/api/editions/lepin-2026/runners/ghost');
    expect(response.status).toBe(404);
  });
});
