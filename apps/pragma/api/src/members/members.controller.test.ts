/**
 * Back-e2e for the members CRUD + member-instrument M2M endpoints.
 * Covers auth gating, CRUD round-trip, the M2M assignment replace,
 * and the foreign-key validation on the assignment payload (DSQL does
 * not enforce FK; the controller does the check up-front).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const memberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
  avatarS3Key: z.string().nullable(),
});
const singleMemberEnvelope = z.object({ member: memberSchema });
const memberListEnvelope = z.object({ members: z.array(memberSchema) });

const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isHarmonic: z.boolean(),
});
const singleInstrumentEnvelope = z.object({ instrument: instrumentSchema });
const instrumentListEnvelope = z.object({ instruments: z.array(instrumentSchema) });
const assignmentResponseSchema = z.object({
  id: z.string().uuid(),
  instrumentIds: z.array(z.string().uuid()),
});

async function createInstrument(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
  name: string,
  isHarmonic: boolean,
): Promise<string> {
  const response = await jsonRequest(app, '/api/instruments', {
    method: 'POST',
    body: { name, isHarmonic },
    cookieHeader,
  });
  const created = await readJson(response, singleInstrumentEnvelope);
  return created.instrument.id;
}

describe('members controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const list = await jsonRequest(app, '/api/members');
    const create = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Hugo', color: '#abc' },
    });
    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });

  it('creates, lists, updates and deletes members', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Hugo', color: '#d96f5a' },
      cookieHeader,
    });
    expect(create.status).toBe(201);
    const created = await readJson(create, singleMemberEnvelope);
    expect(created.member.firstName).toBe('Hugo');

    await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Arn', color: '#3f8e8a' },
      cookieHeader,
    });

    const list = await jsonRequest(app, '/api/members', { cookieHeader });
    const listed = await readJson(list, memberListEnvelope);
    expect(listed.members.map((row) => row.firstName)).toEqual(['Arn', 'Hugo']);

    const update = await jsonRequest(app, `/api/members/${created.member.id}`, {
      method: 'PUT',
      body: { firstName: 'Hugo L.', color: '#c79b3e' },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    const updated = await readJson(update, singleMemberEnvelope);
    expect(updated.member.firstName).toBe('Hugo L.');

    const remove = await jsonRequest(app, `/api/members/${created.member.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(remove.status).toBe(200);
  });

  it('rejects hex colors that do not match the pattern', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Hugo', color: 'rebeccapurple' },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('rejects an update with an empty body with 400', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Emma', color: '#7a8f5a' },
      cookieHeader,
    });
    const created = await readJson(create, singleMemberEnvelope);
    const response = await jsonRequest(app, `/api/members/${created.member.id}`, {
      method: 'PUT',
      body: {},
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('assigns instruments to a member and reads them back', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const memberCreate = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Gui', color: '#7b5786' },
      cookieHeader,
    });
    const memberId = (await readJson(memberCreate, singleMemberEnvelope)).member.id;
    const guitarId = await createInstrument(app, cookieHeader, 'Guitar', true);
    const bassId = await createInstrument(app, cookieHeader, 'Bass', true);
    await createInstrument(app, cookieHeader, 'Drums', false);

    const assignment = await jsonRequest(app, `/api/members/${memberId}/instruments`, {
      method: 'PUT',
      body: { instrumentIds: [guitarId, bassId] },
      cookieHeader,
    });
    expect(assignment.status).toBe(200);
    const parsed = await readJson(assignment, assignmentResponseSchema);
    expect(parsed.instrumentIds).toHaveLength(2);

    const list = await jsonRequest(app, `/api/members/${memberId}/instruments`, {
      cookieHeader,
    });
    const listed = await readJson(list, instrumentListEnvelope);
    expect(listed.instruments.map((row) => row.name)).toEqual(['Bass', 'Guitar']);

    // Replace the assignment with a single-instrument set; the old
    // rows must be cleared.
    const replace = await jsonRequest(app, `/api/members/${memberId}/instruments`, {
      method: 'PUT',
      body: { instrumentIds: [bassId] },
      cookieHeader,
    });
    expect(replace.status).toBe(200);
    const listAfterReplace = await jsonRequest(app, `/api/members/${memberId}/instruments`, {
      cookieHeader,
    });
    const remaining = await readJson(listAfterReplace, instrumentListEnvelope);
    expect(remaining.instruments.map((row) => row.name)).toEqual(['Bass']);
  });

  it('rejects an assignment that references an unknown instrument', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const memberCreate = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Cosyn', color: '#7a8f5a' },
      cookieHeader,
    });
    const memberId = (await readJson(memberCreate, singleMemberEnvelope)).member.id;
    const response = await jsonRequest(app, `/api/members/${memberId}/instruments`, {
      method: 'PUT',
      body: { instrumentIds: ['00000000-0000-0000-0000-000000000000'] },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 on an assignment for a missing member', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(
      app,
      '/api/members/00000000-0000-0000-0000-000000000000/instruments',
      { method: 'PUT', body: { instrumentIds: [] }, cookieHeader },
    );
    expect(response.status).toBe(404);
  });
});
