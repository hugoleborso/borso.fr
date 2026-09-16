import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const barSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  notes: z.string(),
  lastInteractionAt: z.string().nullable(),
  city: z.string().nullable(),
  capacity: z.number().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  ownerMemberId: z.string().nullable(),
  concertMood: z.enum(['chill', 'gig', 'ticketed']).nullable(),
  availableSupport: z.array(z.enum(['pa-system', 'lights', 'sound-engineer'])),
});
const singleEnvelope = z.object({ bar: barSchema });
const listEnvelope = z.object({ bars: z.array(barSchema) });

// @FollowsBlueprint test-back-e2e
describe('bars controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/bars')).status).toBe(401);
  });

  it('persists every spec status value', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    for (const status of ['lead', 'contacted', 'booked', 'played', 'cold'] as const) {
      const response = await jsonRequest(app, '/api/bars', {
        method: 'POST',
        body: { name: `Bar-${status}`, status },
        cookieHeader,
      });
      const bar = await readJson(response, singleEnvelope);
      expect(bar.bar.status).toBe(status);
    }
    const list = await readJson(
      await jsonRequest(app, '/api/bars', { cookieHeader }),
      listEnvelope,
    );
    expect(list.bars).toHaveLength(5);
  });

  it('updates a bar via partial PUT and reflects new fields', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await readJson(
      await jsonRequest(app, '/api/bars', {
        method: 'POST',
        body: {
          name: 'Les Disquaires',
          status: 'lead',
          city: 'Paris',
          capacity: 80,
          contactName: 'Marie',
          contactEmail: 'marie@example.com',
        },
        cookieHeader,
      }),
      singleEnvelope,
    );
    const update = await jsonRequest(app, `/api/bars/${created.bar.id}`, {
      method: 'PUT',
      body: { notes: 'follow up next week' },
      cookieHeader,
    });
    const updated = await readJson(update, singleEnvelope);
    expect(updated.bar.notes).toBe('follow up next week');
    expect(updated.bar.contactName).toBe('Marie');
  });

  it('moves a bar to a new status (the kanban drag use case)', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await readJson(
      await jsonRequest(app, '/api/bars', {
        method: 'POST',
        body: { name: 'Le Truskel', status: 'lead' },
        cookieHeader,
      }),
      singleEnvelope,
    );
    const dragged = await readJson(
      await jsonRequest(app, `/api/bars/${created.bar.id}`, {
        method: 'PUT',
        body: { status: 'booked' },
        cookieHeader,
      }),
      singleEnvelope,
    );
    expect(dragged.bar.status).toBe('booked');
  });

  it('carries the owner through create and clears it when that member goes', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const memberEnvelope = z.object({ member: z.object({ id: z.string().uuid() }) });
    const member = await readJson(
      await jsonRequest(app, '/api/members', {
        method: 'POST',
        body: { firstName: 'Ada' },
        cookieHeader,
      }),
      memberEnvelope,
    );
    const created = await readJson(
      await jsonRequest(app, '/api/bars', {
        method: 'POST',
        body: { name: 'Le Zinc', status: 'lead', ownerMemberId: member.member.id },
        cookieHeader,
      }),
      singleEnvelope,
    );
    expect(created.bar.ownerMemberId).toBe(member.member.id);

    await jsonRequest(app, `/api/members/${member.member.id}`, {
      method: 'DELETE',
      cookieHeader,
    });

    const reread = await readJson(
      await jsonRequest(app, `/api/bars/${created.bar.id}`, { cookieHeader }),
      singleEnvelope,
    );
    expect(reread.bar.ownerMemberId).toBeNull();
    expect(reread.bar.name).toBe('Le Zinc');
  });

  it('keeps the mood and the support a bar was qualified with', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await readJson(
      await jsonRequest(app, '/api/bars', {
        method: 'POST',
        body: {
          name: 'Le Klub',
          status: 'lead',
          concertMood: 'ticketed',
          availableSupport: ['sound-engineer', 'pa-system'],
        },
        cookieHeader,
      }),
      singleEnvelope,
    );
    expect(created.bar.concertMood).toBe('ticketed');
    expect(created.bar.availableSupport).toEqual(['pa-system', 'sound-engineer']);

    const emptied = await readJson(
      await jsonRequest(app, `/api/bars/${created.bar.id}`, {
        method: 'PUT',
        body: { availableSupport: [] },
        cookieHeader,
      }),
      singleEnvelope,
    );
    expect(emptied.bar.availableSupport).toEqual([]);
    expect(emptied.bar.concertMood).toBe('ticketed');
  });

  it('defaults a bar nobody qualified to no mood and no support', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await readJson(
      await jsonRequest(app, '/api/bars', {
        method: 'POST',
        body: { name: 'Le Zinc', status: 'lead' },
        cookieHeader,
      }),
      singleEnvelope,
    );
    expect(created.bar.concertMood).toBeNull();
    expect(created.bar.availableSupport).toEqual([]);
  });

  it('rejects a support the band does not name', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/bars', {
      method: 'POST',
      body: { name: 'X', status: 'lead', availableSupport: ['smoke-machine'] },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('rejects an unknown status value', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/bars', {
      method: 'POST',
      body: { name: 'X', status: 'maybe' },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('deletes a bar and returns 404 on a missing one', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const created = await readJson(
      await jsonRequest(app, '/api/bars', {
        method: 'POST',
        body: { name: 'Y', status: 'cold' },
        cookieHeader,
      }),
      singleEnvelope,
    );
    const remove = await jsonRequest(app, `/api/bars/${created.bar.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(remove.status).toBe(200);
    const removeAgain = await jsonRequest(app, `/api/bars/${created.bar.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(removeAgain.status).toBe(404);
  });
});
