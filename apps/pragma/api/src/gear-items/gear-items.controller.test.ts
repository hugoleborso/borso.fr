import { randomUUID } from 'node:crypto';
import { GEAR_ITEM_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import {
  type LockHold,
  runSecondWhileFirstWaitsOnHold,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import { gearItemTable } from './gear-items.schema';

type App = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

const itemSchema = z.object({
  id: z.guid(),
  sessionId: z.guid(),
  label: z.string(),
  status: z.enum(['to_find', 'asked_of_venue', 'have']),
  memberId: z.guid().nullable(),
  position: z.number().int(),
});
const itemEnvelope = z.object({ item: itemSchema });
const itemsEnvelope = z.object({ items: z.array(itemSchema) });
const checklistEnvelope = z.object({
  items: z.array(itemSchema),
  copySource: z
    .object({
      sessionId: z.guid(),
      venue: z.string().nullable(),
      date: z.string(),
      itemCount: z.number(),
    })
    .nullable(),
});
const errorEnvelope = z.object({ error: z.string() });
const sessionEnvelope = z.object({ session: z.object({ id: z.guid() }) });
const memberEnvelope = z.object({ member: z.object({ id: z.guid() }) });

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const EARLIER_CONCERT_DATE = '2099-03-01T20:00:00Z';
const LATER_CONCERT_DATE = '2099-04-01T20:00:00Z';

async function createConcert(app: App, cookieHeader: string, date: string): Promise<string> {
  const response = await jsonRequest(app, '/api/sessions', {
    method: 'POST',
    body: { kind: 'concert', date, venue: 'Akanaboum', capacity: 200 },
    cookieHeader,
  });
  return (await readJson(response, sessionEnvelope)).session.id;
}

async function createPractice(app: App, cookieHeader: string): Promise<string> {
  const response = await jsonRequest(app, '/api/sessions', {
    method: 'POST',
    body: { kind: 'practice', date: EARLIER_CONCERT_DATE },
    cookieHeader,
  });
  return (await readJson(response, sessionEnvelope)).session.id;
}

async function addMember(app: App, cookieHeader: string, firstName: string): Promise<string> {
  const response = await jsonRequest(app, '/api/members', {
    method: 'POST',
    body: { firstName },
    cookieHeader,
  });
  return (await readJson(response, memberEnvelope)).member.id;
}

async function addItem(
  app: App,
  cookieHeader: string,
  sessionId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return await jsonRequest(app, `/api/gear-items/${sessionId}`, {
    method: 'POST',
    body: { id: randomUUID(), ...body },
    cookieHeader,
  });
}

async function readChecklist(app: App, cookieHeader: string, sessionId: string) {
  const response = await jsonRequest(app, `/api/gear-items/${sessionId}`, { cookieHeader });
  return await readJson(response, checklistEnvelope);
}

function holdGearItemRow(itemId: string): LockHold {
  return async (transaction) =>
    await transaction
      .select({ id: gearItemTable.id })
      .from(gearItemTable)
      .where(eq(gearItemTable.id, itemId))
      .for('update');
}

// @FollowsBlueprint test-back-e2e
describe('gear items controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const responses = await Promise.all([
      jsonRequest(app, `/api/gear-items/${UNKNOWN_ID}`),
      jsonRequest(app, `/api/gear-items/${UNKNOWN_ID}`, {
        method: 'POST',
        body: { id: randomUUID(), label: 'Sono' },
      }),
      jsonRequest(app, `/api/gear-items/${UNKNOWN_ID}/${UNKNOWN_ID}`, {
        method: 'PUT',
        body: { label: 'Sono' },
      }),
      jsonRequest(app, `/api/gear-items/${UNKNOWN_ID}/${UNKNOWN_ID}`, { method: 'DELETE' }),
      jsonRequest(app, `/api/gear-items/${UNKNOWN_ID}/copy`, {
        method: 'POST',
        body: { fromSessionId: UNKNOWN_ID },
      }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401]);
  });

  it('creates, lists in the order added, updates and deletes an item', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const concertId = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);

    const create = await addItem(app, cookieHeader, concertId, { label: '  Multiprise  ' });
    expect(create.status).toBe(201);
    const created = await readJson(create, itemEnvelope);
    expect(created.item).toMatchObject({
      sessionId: concertId,
      label: 'Multiprise',
      status: 'to_find',
      memberId: null,
      position: 0,
    });
    await addItem(app, cookieHeader, concertId, { label: 'Ampli basse', status: 'have', memberId });

    const update = await jsonRequest(app, `/api/gear-items/${concertId}/${created.item.id}`, {
      method: 'PUT',
      body: { status: 'asked_of_venue', memberId: null },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    expect((await readJson(update, itemEnvelope)).item.status).toBe('asked_of_venue');

    const checklist = await readChecklist(app, cookieHeader, concertId);
    expect(checklist.items.map((item) => [item.label, item.status, item.position])).toEqual([
      ['Multiprise', 'asked_of_venue', 0],
      ['Ampli basse', 'have', 1],
    ]);

    const remove = await jsonRequest(app, `/api/gear-items/${concertId}/${created.item.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(remove.status).toBe(200);
    expect(await remove.json()).toEqual({ id: created.item.id, deleted: true });
    expect((await readChecklist(app, cookieHeader, concertId)).items).toHaveLength(1);
  });

  it('lands a retried create on the same row', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const concertId = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const body = { id: randomUUID(), label: 'Sono' };

    const first = await addItem(app, cookieHeader, concertId, body);
    const retried = await addItem(app, cookieHeader, concertId, body);

    expect(first.status).toBe(201);
    expect((await readJson(retried, itemEnvelope)).item.id).toBe(body.id);
    expect((await readChecklist(app, cookieHeader, concertId)).items).toHaveLength(1);
  });

  it('refuses have without a member, a member on to_find, and a status without its member', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const concertId = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const created = await readJson(
      await addItem(app, cookieHeader, concertId, { label: 'Sono' }),
      itemEnvelope,
    );
    const itemPath = `/api/gear-items/${concertId}/${created.item.id}`;

    const haveWithoutMember = await addItem(app, cookieHeader, concertId, {
      label: 'Ampli',
      status: 'have',
    });
    const memberOnToFind = await addItem(app, cookieHeader, concertId, {
      label: 'Ampli',
      memberId,
    });
    const statusWithoutMember = await jsonRequest(app, itemPath, {
      method: 'PUT',
      body: { status: 'have' },
      cookieHeader,
    });
    const memberOnVenue = await jsonRequest(app, itemPath, {
      method: 'PUT',
      body: { status: 'asked_of_venue', memberId },
      cookieHeader,
    });

    for (const refused of [haveWithoutMember, memberOnToFind, statusWithoutMember, memberOnVenue]) {
      expect(refused.status).toBe(400);
      expect(await readJson(refused, errorEnvelope)).toEqual({ error: 'holding-invalid' });
    }
  });

  it('refuses a member who does not exist, an empty patch and a label empty or too long', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const concertId = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const created = await readJson(
      await addItem(app, cookieHeader, concertId, { label: 'Sono' }),
      itemEnvelope,
    );

    const unknownMember = await addItem(app, cookieHeader, concertId, {
      label: 'Ampli',
      status: 'have',
      memberId: UNKNOWN_ID,
    });
    const emptyPatch = await jsonRequest(app, `/api/gear-items/${concertId}/${created.item.id}`, {
      method: 'PUT',
      body: {},
      cookieHeader,
    });
    const blankLabel = await addItem(app, cookieHeader, concertId, { label: '   ' });
    const longestLabel = await addItem(app, cookieHeader, concertId, {
      label: 'x'.repeat(GEAR_ITEM_LABEL_MAX_LENGTH),
    });
    const tooLongLabel = await addItem(app, cookieHeader, concertId, {
      label: 'x'.repeat(GEAR_ITEM_LABEL_MAX_LENGTH + 1),
    });

    expect(await readJson(unknownMember, errorEnvelope)).toEqual({ error: 'member-not-found' });
    expect(await readJson(emptyPatch, errorEnvelope)).toEqual({ error: 'empty-update' });
    expect(blankLabel.status).toBe(400);
    expect(longestLabel.status).toBe(201);
    expect(tooLongLabel.status).toBe(400);
  });

  it('answers not-a-concert for a practice and for an unknown session', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const practiceId = await createPractice(app, cookieHeader);

    const responses = [
      await jsonRequest(app, `/api/gear-items/${practiceId}`, { cookieHeader }),
      await addItem(app, cookieHeader, practiceId, { label: 'Sono' }),
      await jsonRequest(app, `/api/gear-items/${practiceId}/copy`, {
        method: 'POST',
        body: { fromSessionId: UNKNOWN_ID },
        cookieHeader,
      }),
      await jsonRequest(app, `/api/gear-items/${UNKNOWN_ID}`, { cookieHeader }),
    ];

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(await readJson(response, errorEnvelope)).toEqual({ error: 'not-a-concert' });
    }
  });

  it('answers not-found for an item of another concert or an unknown id', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const firstConcert = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const secondConcert = await createConcert(app, cookieHeader, LATER_CONCERT_DATE);
    const created = await readJson(
      await addItem(app, cookieHeader, firstConcert, { label: 'Sono' }),
      itemEnvelope,
    );

    const updateElsewhere = await jsonRequest(
      app,
      `/api/gear-items/${secondConcert}/${created.item.id}`,
      { method: 'PUT', body: { label: 'Stolen' }, cookieHeader },
    );
    const deleteElsewhere = await jsonRequest(
      app,
      `/api/gear-items/${secondConcert}/${created.item.id}`,
      { method: 'DELETE', cookieHeader },
    );
    const deleteUnknown = await jsonRequest(app, `/api/gear-items/${firstConcert}/${UNKNOWN_ID}`, {
      method: 'DELETE',
      cookieHeader,
    });

    expect(updateElsewhere.status).toBe(404);
    expect(deleteElsewhere.status).toBe(404);
    expect(deleteUnknown.status).toBe(404);
    expect((await readChecklist(app, cookieHeader, firstConcert)).items).toMatchObject([
      { label: 'Sono' },
    ]);
  });

  it('copies labels, statuses and holders from the latest earlier concert holding items', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const earlier = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const later = await createConcert(app, cookieHeader, LATER_CONCERT_DATE);
    await addItem(app, cookieHeader, earlier, { label: 'Ampli basse', status: 'have', memberId });
    await addItem(app, cookieHeader, earlier, { label: 'Sono', status: 'asked_of_venue' });
    await addItem(app, cookieHeader, earlier, { label: 'Multiprise' });

    const before = await readChecklist(app, cookieHeader, later);
    const copy = await jsonRequest(app, `/api/gear-items/${later}/copy`, {
      method: 'POST',
      body: { fromSessionId: earlier },
      cookieHeader,
    });
    const after = await readChecklist(app, cookieHeader, later);

    expect(before.copySource).toEqual({
      sessionId: earlier,
      venue: 'Akanaboum',
      date: new Date(EARLIER_CONCERT_DATE).toISOString(),
      itemCount: 3,
    });
    expect(copy.status).toBe(201);
    expect((await readJson(copy, itemsEnvelope)).items).toHaveLength(3);
    expect(after.items.map((item) => [item.label, item.status, item.memberId])).toEqual([
      ['Ampli basse', 'have', memberId],
      ['Sono', 'asked_of_venue', null],
      ['Multiprise', 'to_find', null],
    ]);
    expect(after.items.every((item) => item.sessionId === later)).toBe(true);
  });

  it('refuses a copy into a concert that holds items', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const earlier = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const later = await createConcert(app, cookieHeader, LATER_CONCERT_DATE);
    await addItem(app, cookieHeader, earlier, { label: 'Sono' });
    await addItem(app, cookieHeader, later, { label: 'Pédalier' });

    const copy = await jsonRequest(app, `/api/gear-items/${later}/copy`, {
      method: 'POST',
      body: { fromSessionId: earlier },
      cookieHeader,
    });

    expect(copy.status).toBe(409);
    expect(await readJson(copy, errorEnvelope)).toEqual({ error: 'gear-not-empty' });
    expect((await readChecklist(app, cookieHeader, later)).items).toHaveLength(1);
  });

  it('answers no copy source when no earlier concert holds items', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const earlier = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const later = await createConcert(app, cookieHeader, LATER_CONCERT_DATE);
    await addItem(app, cookieHeader, later, { label: 'Sono' });

    expect((await readChecklist(app, cookieHeader, earlier)).copySource).toBeNull();
    expect((await readChecklist(app, cookieHeader, later)).copySource).toBeNull();
  });

  it('puts an item back to find when its member is deleted', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const concertId = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const almaId = await addMember(app, cookieHeader, 'Alma');
    await addItem(app, cookieHeader, concertId, {
      label: 'Ampli',
      status: 'have',
      memberId: almaId,
    });

    const removal = await jsonRequest(app, `/api/members/${almaId}`, {
      method: 'DELETE',
      cookieHeader,
    });

    expect(removal.status).toBe(200);
    expect((await readChecklist(app, cookieHeader, concertId)).items).toMatchObject([
      { label: 'Ampli', status: 'to_find', memberId: null },
    ]);
  });

  it('never leaves an item held by a member deleted while it was written', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const concertId = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const almaId = await addMember(app, cookieHeader, 'Alma');
    const created = await readJson(
      await addItem(app, cookieHeader, concertId, { label: 'Ampli' }),
      itemEnvelope,
    );

    const [, removal] = await runSecondWhileFirstWaitsOnHold(
      holdGearItemRow(created.item.id),
      async () =>
        await jsonRequest(app, `/api/gear-items/${concertId}/${created.item.id}`, {
          method: 'PUT',
          body: { status: 'have', memberId: almaId },
          cookieHeader,
        }),
      async () =>
        await jsonRequest(app, `/api/members/${almaId}`, { method: 'DELETE', cookieHeader }),
    );

    expect(removal.status).toBe(200);
    const stored = await testDatabase()
      .select({ status: gearItemTable.status, memberId: gearItemTable.memberId })
      .from(gearItemTable);
    expect(stored).toEqual([{ status: 'to_find', memberId: null }]);
  });

  it('deletes the gear of a concert with the concert', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const concertId = await createConcert(app, cookieHeader, EARLIER_CONCERT_DATE);
    const keptConcert = await createConcert(app, cookieHeader, LATER_CONCERT_DATE);
    await addItem(app, cookieHeader, concertId, { label: 'Sono' });
    await addItem(app, cookieHeader, keptConcert, { label: 'Pédalier' });

    const removal = await jsonRequest(app, `/api/sessions/${concertId}`, {
      method: 'DELETE',
      cookieHeader,
    });

    expect(removal.status).toBe(200);
    const stored = await testDatabase().select({ label: gearItemTable.label }).from(gearItemTable);
    expect(stored).toEqual([{ label: 'Pédalier' }]);
  });
});
