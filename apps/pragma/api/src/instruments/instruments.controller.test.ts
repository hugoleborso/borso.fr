/**
 * Back-e2e for the instruments CRUD endpoints. Covers:
 *  - auth gating: every verb returns 401 without a session cookie.
 *  - list returns the alphabetically sorted set.
 *  - create / update / delete round-trip against the real Postgres.
 *  - update with an empty body returns 400.
 *  - update / delete on a missing id returns 404.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isHarmonic: z.boolean(),
});
const singleInstrumentEnvelope = z.object({ instrument: instrumentSchema });
const instrumentListEnvelope = z.object({ instruments: z.array(instrumentSchema) });

describe('instruments controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const listResponse = await jsonRequest(app, '/api/instruments');
    const createResponse = await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Guitar', isHarmonic: true },
    });
    const updateResponse = await jsonRequest(
      app,
      '/api/instruments/00000000-0000-0000-0000-000000000000',
      { method: 'PUT', body: { name: 'X' } },
    );
    const deleteResponse = await jsonRequest(
      app,
      '/api/instruments/00000000-0000-0000-0000-000000000000',
      { method: 'DELETE' },
    );
    expect(listResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
    expect(updateResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
  });

  it('creates, lists, updates and deletes instruments', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();

    const create = await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Guitar', isHarmonic: true },
      cookieHeader,
    });
    expect(create.status).toBe(201);
    const created = await readJson(create, singleInstrumentEnvelope);
    expect(created.instrument.name).toBe('Guitar');
    expect(created.instrument.isHarmonic).toBe(true);

    await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Drums', isHarmonic: false },
      cookieHeader,
    });

    const listResponse = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const listed = await readJson(listResponse, instrumentListEnvelope);
    expect(listed.instruments.map((row) => row.name)).toEqual(['Drums', 'Guitar']);

    const updateResponse = await jsonRequest(
      app,
      `/api/instruments/${created.instrument.id}`,
      { method: 'PUT', body: { name: 'Bass', isHarmonic: true }, cookieHeader },
    );
    expect(updateResponse.status).toBe(200);
    const updated = await readJson(updateResponse, singleInstrumentEnvelope);
    expect(updated.instrument.name).toBe('Bass');

    const deleteResponse = await jsonRequest(
      app,
      `/api/instruments/${created.instrument.id}`,
      { method: 'DELETE', cookieHeader },
    );
    expect(deleteResponse.status).toBe(200);

    const afterDelete = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const remaining = await readJson(afterDelete, instrumentListEnvelope);
    expect(remaining.instruments.map((row) => row.name)).toEqual(['Drums']);
  });

  it('rejects an update with an empty body with 400', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Voice', isHarmonic: false },
      cookieHeader,
    });
    const created = await readJson(create, singleInstrumentEnvelope);
    const response = await jsonRequest(app, `/api/instruments/${created.instrument.id}`, {
      method: 'PUT',
      body: {},
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 on update / delete of a missing id', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const missingId = '11111111-1111-1111-1111-111111111111';
    const update = await jsonRequest(app, `/api/instruments/${missingId}`, {
      method: 'PUT',
      body: { name: 'Tuba' },
      cookieHeader,
    });
    const remove = await jsonRequest(app, `/api/instruments/${missingId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});
