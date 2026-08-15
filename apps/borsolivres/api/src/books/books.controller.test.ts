/**
 * Back-e2e for the books endpoints, driven through the real application
 * against the test Postgres.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { truncateAllTables, testDatabase } from '../../../test/database-utils';
import { jsonRequest, readJson } from '../../../test/request-utils';
import { createApp } from '../app';

const bookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  author: z.string(),
  status: z.string(),
  rating: z.number().nullable(),
  notes: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  isbn: z.string().nullable(),
  coverUrl: z.string().nullable(),
  shelfId: z.string().nullable(),
});
const singleEnvelope = z.object({ book: bookSchema });
const listEnvelope = z.object({ books: z.array(bookSchema) });

const WANT_TO_READ = { title: 'Piranesi', author: 'Susanna Clarke', status: 'want-to-read' };

// @FollowsBlueprint test-back-e2e
describe('books controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('persists every status the domain allows', async () => {
    const app = createApp();
    for (const status of ['want-to-read', 'reading', 'finished', 'abandoned'] as const) {
      const response = await jsonRequest(app, '/api/books', {
        method: 'POST',
        body: { title: `Book ${status}`, author: 'A. Writer', status },
      });
      const created = await readJson(response, singleEnvelope);
      expect(created.book.status).toBe(status);
    }
    const catalogue = await readJson(await jsonRequest(app, '/api/books'), listEnvelope);
    expect(catalogue.books).toHaveLength(4);
  });

  it('sorts the catalogue by title', async () => {
    const app = createApp();
    for (const title of ['Solaris', 'Annihilation', 'Dune']) {
      await jsonRequest(app, '/api/books', {
        method: 'POST',
        body: { title, author: 'A. Writer', status: 'want-to-read' },
      });
    }
    const catalogue = await readJson(await jsonRequest(app, '/api/books'), listEnvelope);
    expect(catalogue.books.map((book) => book.title)).toEqual(['Annihilation', 'Dune', 'Solaris']);
  });

  it('stamps the start date when a book moves to reading', async () => {
    const app = createApp();
    const created = await readJson(
      await jsonRequest(app, '/api/books', { method: 'POST', body: WANT_TO_READ }),
      singleEnvelope,
    );
    const updated = await readJson(
      await jsonRequest(app, `/api/books/${created.book.id}`, {
        method: 'PUT',
        body: { status: 'reading' },
      }),
      singleEnvelope,
    );
    expect(updated.book.startedAt).not.toBeNull();
    expect(updated.book.finishedAt).toBeNull();
  });

  it('refuses a rating on a book that is not finished', async () => {
    const app = createApp();
    const created = await readJson(
      await jsonRequest(app, '/api/books', { method: 'POST', body: WANT_TO_READ }),
      singleEnvelope,
    );
    const rejected = await jsonRequest(app, `/api/books/${created.book.id}`, {
      method: 'PUT',
      body: { status: 'reading', rating: 5 },
    });
    expect(rejected.status).toBe(409);
  });

  it('refuses a book finished before it was started', async () => {
    const app = createApp();
    const rejected = await jsonRequest(app, '/api/books', {
      method: 'POST',
      body: {
        ...WANT_TO_READ,
        status: 'finished',
        startedAt: '2026-03-01',
        finishedAt: '2026-02-01',
      },
    });
    expect(rejected.status).toBe(422);
  });

  it('keeps a rating once the book is finished', async () => {
    const app = createApp();
    const created = await readJson(
      await jsonRequest(app, '/api/books', {
        method: 'POST',
        body: { ...WANT_TO_READ, status: 'finished', rating: 5 },
      }),
      singleEnvelope,
    );
    expect(created.book.rating).toBe(5);
    expect(created.book.finishedAt).not.toBeNull();
  });

  it('reads one book back by identifier', async () => {
    const app = createApp();
    const created = await readJson(
      await jsonRequest(app, '/api/books', { method: 'POST', body: WANT_TO_READ }),
      singleEnvelope,
    );
    const read = await readJson(
      await jsonRequest(app, `/api/books/${created.book.id}`),
      singleEnvelope,
    );
    expect(read.book.title).toBe('Piranesi');
  });

  it('answers 404 for a book that does not exist', async () => {
    const app = createApp();
    const missingId = '00000000-0000-4000-8000-000000000000';
    expect((await jsonRequest(app, `/api/books/${missingId}`)).status).toBe(404);
    expect(
      (await jsonRequest(app, `/api/books/${missingId}`, { method: 'PUT', body: { notes: 'x' } }))
        .status,
    ).toBe(404);
    expect((await jsonRequest(app, `/api/books/${missingId}`, { method: 'DELETE' })).status).toBe(
      404,
    );
  });

  it('deletes a book and drops it from the catalogue', async () => {
    const app = createApp();
    const created = await readJson(
      await jsonRequest(app, '/api/books', { method: 'POST', body: WANT_TO_READ }),
      singleEnvelope,
    );
    expect(
      (await jsonRequest(app, `/api/books/${created.book.id}`, { method: 'DELETE' })).status,
    ).toBe(200);
    const catalogue = await readJson(await jsonRequest(app, '/api/books'), listEnvelope);
    expect(catalogue.books).toEqual([]);
  });

  it('rejects a body the schema does not accept', async () => {
    const app = createApp();
    const rejected = await jsonRequest(app, '/api/books', {
      method: 'POST',
      body: { title: '', author: 'A. Writer', status: 'want-to-read' },
    });
    expect(rejected.status).toBe(400);
  });

  it('rejects a lookup with no query', async () => {
    const app = createApp();
    expect((await jsonRequest(app, '/api/books/lookup')).status).toBe(400);
  });
});
