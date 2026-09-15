import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const templateEnvelope = z.object({ body: z.string().nullable() });
const savedEnvelope = z.object({ body: z.string() });

// @FollowsBlueprint test-back-e2e
describe('outreach controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects a read without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/outreach/template')).status).toBe(401);
  });

  it('has no template until the band writes one, then serves what it saved', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const empty = await readJson(
      await jsonRequest(app, '/api/outreach/template', { cookieHeader }),
      templateEnvelope,
    );
    expect(empty.body).toBeNull();

    const saved = await readJson(
      await jsonRequest(app, '/api/outreach/template', {
        method: 'PUT',
        body: { body: 'Hey {{bar}}' },
        cookieHeader,
      }),
      savedEnvelope,
    );
    expect(saved.body).toBe('Hey {{bar}}');

    const reread = await readJson(
      await jsonRequest(app, '/api/outreach/template', { cookieHeader }),
      templateEnvelope,
    );
    expect(reread.body).toBe('Hey {{bar}}');
  });

  it('overwrites the single template row rather than adding a second one', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    for (const body of ['first', 'second']) {
      await jsonRequest(app, '/api/outreach/template', {
        method: 'PUT',
        body: { body },
        cookieHeader,
      });
    }
    const reread = await readJson(
      await jsonRequest(app, '/api/outreach/template', { cookieHeader }),
      templateEnvelope,
    );
    expect(reread.body).toBe('second');
  });

  it('refuses an empty template', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/outreach/template', {
      method: 'PUT',
      body: { body: '   ' },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });
});
