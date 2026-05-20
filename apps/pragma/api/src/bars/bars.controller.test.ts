/**
 * Back-e2e for the bars CRM endpoints. Covers auth gating, CRUD, the
 * five spec status values (`lead | contacted | booked | played |
 * cold`), and the kanban-drag use case (PUT with `{ status }` only —
 * stage transition from drag-and-drop).
 */

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
});
const singleEnvelope = z.object({ bar: barSchema });
const listEnvelope = z.object({ bars: z.array(barSchema) });

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
      const parsed = await readJson(response, singleEnvelope);
      expect(parsed.bar.status).toBe(status);
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
