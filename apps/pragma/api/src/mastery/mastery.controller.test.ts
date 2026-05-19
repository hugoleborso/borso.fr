/**
 * Back-e2e for the mastery defaults + overrides endpoints.
 * Covers:
 *  - the upsert semantics on PUT (insert then update).
 *  - the override behaviour: `effective = override ?? default`.
 *    Tested at the API layer by asserting that the same (member,
 *    instrument, song) round-trip is reflected in the override list.
 *  - auth gating.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const defaultsEnvelope = z.object({
  defaults: z.array(
    z.object({
      memberId: z.string().uuid(),
      instrumentId: z.string().uuid(),
      score: z.number(),
    }),
  ),
});

const overridesEnvelope = z.object({
  overrides: z.array(
    z.object({
      memberId: z.string().uuid(),
      instrumentId: z.string().uuid(),
      songId: z.string().uuid(),
      score: z.number(),
    }),
  ),
});

const memberEnvelope = z.object({ member: z.object({ id: z.string().uuid() }) });
const instrumentEnvelope = z.object({ instrument: z.object({ id: z.string().uuid() }) });
const songEnvelope = z.object({ song: z.object({ id: z.string().uuid() }) });

async function seedTriple(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
): Promise<{ memberId: string; instrumentId: string; songId: string }> {
  const memberRes = await jsonRequest(app, '/api/members', {
    method: 'POST',
    body: { firstName: 'Hugo', color: '#abc' },
    cookieHeader,
  });
  const instrumentRes = await jsonRequest(app, '/api/instruments', {
    method: 'POST',
    body: { name: 'Voice', isHarmonic: false },
    cookieHeader,
  });
  const songRes = await jsonRequest(app, '/api/songs', {
    method: 'POST',
    body: { title: 'X', status: 'idea' },
    cookieHeader,
  });
  return {
    memberId: (await readJson(memberRes, memberEnvelope)).member.id,
    instrumentId: (await readJson(instrumentRes, instrumentEnvelope)).instrument.id,
    songId: (await readJson(songRes, songEnvelope)).song.id,
  };
}

describe('mastery controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/mastery/defaults')).status).toBe(401);
  });

  it('upserts a default row on PUT (insert then update)', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { memberId, instrumentId } = await seedTriple(app, cookieHeader);

    await jsonRequest(app, '/api/mastery/defaults', {
      method: 'PUT',
      body: { memberId, instrumentId, score: 7 },
      cookieHeader,
    });
    const after = await readJson(
      await jsonRequest(app, '/api/mastery/defaults', { cookieHeader }),
      defaultsEnvelope,
    );
    expect(after.defaults).toHaveLength(1);
    expect(after.defaults[0]?.score).toBe(7);

    // Second PUT with a different score MUST update, not duplicate.
    await jsonRequest(app, '/api/mastery/defaults', {
      method: 'PUT',
      body: { memberId, instrumentId, score: 9 },
      cookieHeader,
    });
    const second = await readJson(
      await jsonRequest(app, '/api/mastery/defaults', { cookieHeader }),
      defaultsEnvelope,
    );
    expect(second.defaults).toHaveLength(1);
    expect(second.defaults[0]?.score).toBe(9);
  });

  it('upserts an override and lists overrides per song', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { memberId, instrumentId, songId } = await seedTriple(app, cookieHeader);

    await jsonRequest(app, '/api/mastery/defaults', {
      method: 'PUT',
      body: { memberId, instrumentId, score: 7 },
      cookieHeader,
    });
    await jsonRequest(app, '/api/mastery/overrides', {
      method: 'PUT',
      body: { memberId, instrumentId, songId, score: 3 },
      cookieHeader,
    });
    const overrides = await readJson(
      await jsonRequest(app, `/api/mastery/overrides/${songId}`, { cookieHeader }),
      overridesEnvelope,
    );
    expect(overrides.overrides).toHaveLength(1);
    expect(overrides.overrides[0]?.score).toBe(3);
  });

  it('respects override score=0 as a legitimate "ne joue pas" — does not duplicate', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { memberId, instrumentId, songId } = await seedTriple(app, cookieHeader);
    await jsonRequest(app, '/api/mastery/overrides', {
      method: 'PUT',
      body: { memberId, instrumentId, songId, score: 0 },
      cookieHeader,
    });
    const after = await readJson(
      await jsonRequest(app, `/api/mastery/overrides/${songId}`, { cookieHeader }),
      overridesEnvelope,
    );
    expect(after.overrides).toHaveLength(1);
    expect(after.overrides[0]?.score).toBe(0);
  });

  it('deletes a default row', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const { memberId, instrumentId } = await seedTriple(app, cookieHeader);
    await jsonRequest(app, '/api/mastery/defaults', {
      method: 'PUT',
      body: { memberId, instrumentId, score: 5 },
      cookieHeader,
    });
    const remove = await jsonRequest(
      app,
      `/api/mastery/defaults/${memberId}/${instrumentId}`,
      { method: 'DELETE', cookieHeader },
    );
    expect(remove.status).toBe(200);
    const after = await readJson(
      await jsonRequest(app, '/api/mastery/defaults', { cookieHeader }),
      defaultsEnvelope,
    );
    expect(after.defaults).toHaveLength(0);
  });

  it('returns 404 on delete of a missing default / override', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const missing = '11111111-1111-1111-1111-111111111111';
    const removeDefault = await jsonRequest(
      app,
      `/api/mastery/defaults/${missing}/${missing}`,
      { method: 'DELETE', cookieHeader },
    );
    const removeOverride = await jsonRequest(
      app,
      `/api/mastery/overrides/${missing}/${missing}/${missing}`,
      { method: 'DELETE', cookieHeader },
    );
    expect(removeDefault.status).toBe(404);
    expect(removeOverride.status).toBe(404);
  });
});
