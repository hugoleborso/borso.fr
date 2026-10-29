import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { INSTRUMENT_ICONS } from '@domain/instrument.core';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import {
  abortCommitsWritingTable,
  type LockHold,
  runSecondWhileFirstWaitsOnHold,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import { instrumentTable } from './instruments.schema';

const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  family: z.enum(['harmonic', 'percussive', 'vocal', 'other']),
  icon: z.enum(INSTRUMENT_ICONS),
  position: z.number().int(),
  players: z.array(z.object({ memberId: z.string().uuid() })),
});
const singleInstrumentEnvelope = z.object({ instrument: instrumentSchema });
const instrumentListEnvelope = z.object({ instruments: z.array(instrumentSchema) });
const lineupSchema = z.record(z.string(), z.array(z.string()));
const songLineupEnvelope = z.object({
  song: z.object({ id: z.string().uuid(), defaultLineup: lineupSchema }),
});
const entryLineupEnvelope = z.object({
  entry: z.object({ id: z.string().uuid(), lineupOverride: lineupSchema.nullable() }),
});
const entryLineupListEnvelope = z.object({ entries: z.array(entryLineupEnvelope.shape.entry) });
const setlistIdEnvelope = z.object({ setlist: z.object({ id: z.string().uuid() }) });

async function createInstrument(
  app: Parameters<typeof jsonRequest>[0],
  cookieHeader: string,
  body: { name: string; family: string; icon?: string },
): Promise<string> {
  const response = await jsonRequest(app, '/api/instruments', {
    method: 'POST',
    body,
    cookieHeader,
  });
  const created = await readJson(response, singleInstrumentEnvelope);
  return created.instrument.id;
}

function holdInstrumentRow(instrumentId: string): LockHold {
  return async (transaction) =>
    await transaction
      .select({ id: instrumentTable.id })
      .from(instrumentTable)
      .where(eq(instrumentTable.id, instrumentId))
      .for('update');
}

async function readPositionsByName(): Promise<Map<string, number | null>> {
  const rows = await testDatabase()
    .select({ name: instrumentTable.name, position: instrumentTable.position })
    .from(instrumentTable);
  return new Map(rows.map((row) => [row.name, row.position]));
}

/**
 * @Blueprint test-back-e2e
 * @BlueprintName Back End End To End Test
 * @BlueprintUsage Use for a controller, exercising its routes through the real app against a live database.
 * @BlueprintDescription Truncates the tables before each case, builds the app and a real session cookie through `buildAuthenticatedApp`, and sends every request through `jsonRequest`, with a first case asserting each verb answers 401 without that cookie. Responses are read through a Zod envelope, so a changed response shape fails the test rather than being read untyped.
 */
describe('instruments controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const listResponse = await jsonRequest(app, '/api/instruments');
    const createResponse = await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Guitar', family: 'harmonic' },
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
      body: { name: 'Guitar', family: 'harmonic' },
      cookieHeader,
    });
    expect(create.status).toBe(201);
    const created = await readJson(create, singleInstrumentEnvelope);
    expect(created.instrument.name).toBe('Guitar');
    expect(created.instrument.family).toBe('harmonic');

    await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Drums', family: 'percussive' },
      cookieHeader,
    });

    const listResponse = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const listed = await readJson(listResponse, instrumentListEnvelope);
    expect(listed.instruments.map((row) => row.name)).toEqual(['Guitar', 'Drums']);

    const updateResponse = await jsonRequest(app, `/api/instruments/${created.instrument.id}`, {
      method: 'PUT',
      body: { name: 'Bass', family: 'harmonic' },
      cookieHeader,
    });
    expect(updateResponse.status).toBe(200);
    const updated = await readJson(updateResponse, singleInstrumentEnvelope);
    expect(updated.instrument.name).toBe('Bass');

    const deleteResponse = await jsonRequest(app, `/api/instruments/${created.instrument.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(deleteResponse.status).toBe(200);

    const afterDelete = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const remaining = await readJson(afterDelete, instrumentListEnvelope);
    expect(remaining.instruments.map((row) => row.name)).toEqual(['Drums']);
  });

  it('takes a deleted instrument out of every song lineup and entry override that held it', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const guitarId = await createInstrument(app, cookieHeader, {
      name: 'Guitar',
      family: 'harmonic',
    });
    const voiceId = await createInstrument(app, cookieHeader, { name: 'Voice', family: 'vocal' });
    const song = await readJson(
      await jsonRequest(app, '/api/songs', {
        method: 'POST',
        body: {
          title: 'Creep',
          status: 'idea',
          defaultLineup: { [memberId]: [guitarId, voiceId] },
        },
        cookieHeader,
      }),
      songLineupEnvelope,
    );
    const setlist = await readJson(
      await jsonRequest(app, '/api/setlists', {
        method: 'POST',
        body: { name: 'Set' },
        cookieHeader,
      }),
      setlistIdEnvelope,
    );
    await jsonRequest(app, `/api/setlists/${setlist.setlist.id}/entries`, {
      method: 'POST',
      body: { songId: song.song.id, lineupOverride: { [memberId]: [guitarId] } },
      cookieHeader,
    });

    await jsonRequest(app, `/api/instruments/${guitarId}`, { method: 'DELETE', cookieHeader });

    const songAfter = await readJson(
      await jsonRequest(app, `/api/songs/${song.song.id}`, { cookieHeader }),
      songLineupEnvelope,
    );
    const entriesAfter = await readJson(
      await jsonRequest(app, `/api/setlists/${setlist.setlist.id}/entries`, { cookieHeader }),
      entryLineupListEnvelope,
    );
    expect(songAfter.song.defaultLineup).toEqual({ [memberId]: [voiceId] });
    expect(entriesAfter.entries.map((entry) => entry.lineupOverride)).toEqual([{ [memberId]: [] }]);
  });

  it('orders the list by family rather than by name, which is what the column reads', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await createInstrument(app, cookieHeader, { name: 'Drums', family: 'percussive' });
    await createInstrument(app, cookieHeader, { name: 'Accordion', family: 'harmonic' });
    await createInstrument(app, cookieHeader, { name: 'Voice', family: 'vocal' });
    await createInstrument(app, cookieHeader, { name: 'Zither', family: 'harmonic' });

    const listResponse = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const listed = await readJson(listResponse, instrumentListEnvelope);
    expect(listed.instruments.map((row) => row.name)).toEqual([
      'Voice',
      'Accordion',
      'Zither',
      'Drums',
    ]);
  });

  it('gives a new instrument the fallback glyph and keeps the one a create names', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await createInstrument(app, cookieHeader, { name: 'Bouzouki', family: 'harmonic' });
    await createInstrument(app, cookieHeader, {
      name: 'Bass',
      family: 'harmonic',
      icon: 'bass',
    });

    const listResponse = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const listed = await readJson(listResponse, instrumentListEnvelope);
    const iconsByName = Object.fromEntries(listed.instruments.map((row) => [row.name, row.icon]));
    expect(iconsByName).toEqual({ Bass: 'bass', Bouzouki: 'music' });
  });

  it('reports who plays each instrument, and an empty list for one nobody plays', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const guitarId = await createInstrument(app, cookieHeader, {
      name: 'Guitar',
      family: 'harmonic',
    });
    await createInstrument(app, cookieHeader, { name: 'Tuba', family: 'other' });
    const memberIds: string[] = [];
    for (const firstName of ['Ana', 'Ben']) {
      const created = await jsonRequest(app, '/api/members', {
        method: 'POST',
        body: { firstName },
        cookieHeader,
      });
      const member = await readJson(created, z.object({ member: z.object({ id: z.string() }) }));
      memberIds.push(member.member.id);
      await jsonRequest(app, `/api/members/${member.member.id}/instruments`, {
        method: 'PUT',
        body: { instrumentIds: [guitarId] },
        cookieHeader,
      });
    }

    const listResponse = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const listed = await readJson(listResponse, instrumentListEnvelope);
    const tuba = listed.instruments.find((row) => row.name === 'Tuba');
    const guitar = listed.instruments.find((row) => row.name === 'Guitar');
    expect(tuba?.players).toEqual([]);
    expect(guitar?.players.map((player) => player.memberId).toSorted()).toEqual(
      memberIds.toSorted(),
    );
  });

  it('reorders the whole list and answers with the settled order, not a stale one', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const voiceId = await createInstrument(app, cookieHeader, { name: 'Voice', family: 'vocal' });
    const drumsId = await createInstrument(app, cookieHeader, {
      name: 'Drums',
      family: 'percussive',
    });

    const reorder = await jsonRequest(app, '/api/instruments/order', {
      method: 'PUT',
      body: { instrumentIds: [drumsId, voiceId] },
      cookieHeader,
    });
    expect(reorder.status).toBe(200);
    const reordered = await readJson(reorder, instrumentListEnvelope);
    expect(reordered.instruments.map((row) => row.name)).toEqual(['Drums', 'Voice']);

    const listResponse = await jsonRequest(app, '/api/instruments', { cookieHeader });
    const listed = await readJson(listResponse, instrumentListEnvelope);
    expect(listed.instruments.map((row) => row.name)).toEqual(['Drums', 'Voice']);
  });

  it('refuses a reorder that does not name every instrument, with 409', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const voiceId = await createInstrument(app, cookieHeader, { name: 'Voice', family: 'vocal' });
    await createInstrument(app, cookieHeader, { name: 'Drums', family: 'percussive' });

    const partial = await jsonRequest(app, '/api/instruments/order', {
      method: 'PUT',
      body: { instrumentIds: [voiceId] },
      cookieHeader,
    });
    const unknown = await jsonRequest(app, '/api/instruments/order', {
      method: 'PUT',
      body: { instrumentIds: [voiceId, '11111111-1111-1111-1111-111111111111'] },
      cookieHeader,
    });
    expect(partial.status).toBe(409);
    expect(unknown.status).toBe(409);
  });

  it('refuses a reorder naming an instrument deleted while it was being written, and moves nothing', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const voiceId = await createInstrument(app, cookieHeader, { name: 'Voice', family: 'vocal' });
    const drumsId = await createInstrument(app, cookieHeader, {
      name: 'Drums',
      family: 'percussive',
    });
    const guitarId = await createInstrument(app, cookieHeader, {
      name: 'Guitar',
      family: 'harmonic',
    });
    const positionsBefore = await readPositionsByName();

    const [deletion, reorder] = await runSecondWhileFirstWaitsOnHold(
      holdInstrumentRow(guitarId),
      async () =>
        await jsonRequest(app, `/api/instruments/${guitarId}`, { method: 'DELETE', cookieHeader }),
      async () =>
        await jsonRequest(app, '/api/instruments/order', {
          method: 'PUT',
          body: { instrumentIds: [drumsId, voiceId, guitarId] },
          cookieHeader,
        }),
    );

    expect(deletion.status).toBe(200);
    expect(reorder.status).toBe(409);
    const positionsAfter = await readPositionsByName();
    expect(positionsAfter.get('Voice')).toBe(positionsBefore.get('Voice'));
    expect(positionsAfter.get('Drums')).toBe(positionsBefore.get('Drums'));
  });

  it('reorders once when the first commit loses a conflict on the claimed instruments', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const voiceId = await createInstrument(app, cookieHeader, { name: 'Voice', family: 'vocal' });
    const drumsId = await createInstrument(app, cookieHeader, {
      name: 'Drums',
      family: 'percussive',
    });
    const removeSimulatedConflict = await abortCommitsWritingTable('instrument', 1);
    try {
      const reorder = await jsonRequest(app, '/api/instruments/order', {
        method: 'PUT',
        body: { instrumentIds: [drumsId, voiceId] },
        cookieHeader,
      });
      expect(reorder.status).toBe(200);
    } finally {
      await removeSimulatedConflict();
    }
    const positions = await readPositionsByName();
    expect([positions.get('Drums'), positions.get('Voice')]).toEqual([0, 1]);
  });

  it('rejects an update with an empty body with 400', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Voice', family: 'vocal' },
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
