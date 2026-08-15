/**
 * Back-e2e for the shelves endpoints. The case that matters is the last one:
 * Aurora DSQL enforces no foreign key, so the cascade is a service calling
 * another slice's service, and only a run against a real database proves the
 * books actually lost their shelf.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { jsonRequest, readJson } from '../../../test/request-utils';
import { createApp } from '../app';

const shelfSchema = z.object({ id: z.string().uuid(), name: z.string() });
const singleEnvelope = z.object({ shelf: shelfSchema });
const listEnvelope = z.object({ shelves: z.array(shelfSchema) });
const deletionEnvelope = z.object({
  id: z.string(),
  deleted: z.boolean(),
  detachedBookCount: z.number(),
});
const bookEnvelope = z.object({
  book: z.object({ id: z.string(), shelfId: z.string().nullable() }),
});

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function createShelfNamed(app: ReturnType<typeof createApp>, name: string) {
  return readJson(
    await jsonRequest(app, '/api/shelves', { method: 'POST', body: { name } }),
    singleEnvelope,
  );
}

// @FollowsBlueprint test-back-e2e
describe('shelves controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('sorts the shelves by name', async () => {
    const app = createApp();
    for (const name of ['To reread', 'Borrowed', 'Nightstand']) {
      await createShelfNamed(app, name);
    }
    const shelves = await readJson(await jsonRequest(app, '/api/shelves'), listEnvelope);
    expect(shelves.shelves.map((shelf) => shelf.name)).toEqual([
      'Borrowed',
      'Nightstand',
      'To reread',
    ]);
  });

  it('reads one shelf back and renames it', async () => {
    const app = createApp();
    const created = await createShelfNamed(app, 'Nightstand');
    const read = await readJson(
      await jsonRequest(app, `/api/shelves/${created.shelf.id}`),
      singleEnvelope,
    );
    expect(read.shelf.name).toBe('Nightstand');
    const renamed = await readJson(
      await jsonRequest(app, `/api/shelves/${created.shelf.id}`, {
        method: 'PUT',
        body: { name: 'Bedside' },
      }),
      singleEnvelope,
    );
    expect(renamed.shelf.name).toBe('Bedside');
  });

  it('answers 404 for a shelf that does not exist', async () => {
    const app = createApp();
    expect((await jsonRequest(app, `/api/shelves/${MISSING_ID}`)).status).toBe(404);
    expect(
      (
        await jsonRequest(app, `/api/shelves/${MISSING_ID}`, {
          method: 'PUT',
          body: { name: 'Ghost' },
        })
      ).status,
    ).toBe(404);
    expect(
      (await jsonRequest(app, `/api/shelves/${MISSING_ID}`, { method: 'DELETE' })).status,
    ).toBe(404);
  });

  it('rejects a shelf with a blank name', async () => {
    const app = createApp();
    expect(
      (await jsonRequest(app, '/api/shelves', { method: 'POST', body: { name: '  ' } })).status,
    ).toBe(400);
  });

  it('detaches every book on a shelf before deleting it, leaving the books in place', async () => {
    const app = createApp();
    const shelf = await createShelfNamed(app, 'Nightstand');
    const shelved = await readJson(
      await jsonRequest(app, '/api/books', {
        method: 'POST',
        body: {
          title: 'Piranesi',
          author: 'Susanna Clarke',
          status: 'reading',
          shelfId: shelf.shelf.id,
        },
      }),
      bookEnvelope,
    );
    expect(shelved.book.shelfId).toBe(shelf.shelf.id);

    const removal = await readJson(
      await jsonRequest(app, `/api/shelves/${shelf.shelf.id}`, { method: 'DELETE' }),
      deletionEnvelope,
    );
    expect(removal.detachedBookCount).toBe(1);

    const survivor = await readJson(
      await jsonRequest(app, `/api/books/${shelved.book.id}`),
      bookEnvelope,
    );
    expect(survivor.book.shelfId).toBeNull();
  });
});
