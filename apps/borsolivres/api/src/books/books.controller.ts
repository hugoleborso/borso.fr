/**
 * The books endpoints, and the lookup endpoint that fronts OpenLibrary.
 *
 * The router carries no authentication middleware, and that is a decision
 * rather than an omission: borsolivres is one person's reading list with no
 * account model, so there is nobody to authenticate. What stands in for a
 * barrier is the per-stage schema, which keeps a preview's rows away from
 * production's. A second reader would need an owner column first, which is a
 * schema change and not a middleware.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  bookCreateSchema,
  bookIdParamSchema,
  bookLookupQuerySchema,
  bookUpdateSchema,
} from './books.schema';
import {
  BookRejectedError,
  createBook,
  findBook,
  listBookLookupMatches,
  listBooksSortedByTitle,
  patchBook,
  removeBook,
  selectBookRejectionStatus,
} from './books.service';

// @FollowsBlueprint controller-public-router
export function buildBooksRouter() {
  return new Hono()
    .onError((error, context) => {
      if (error instanceof BookRejectedError) {
        return context.json({ error: error.reason }, selectBookRejectionStatus(error.reason));
      }
      return context.json({ error: 'internal-error' }, 500);
    })
    .get('/', async (context) => {
      const books = await listBooksSortedByTitle();
      return context.json({ books });
    })
    .get('/lookup', zValidator('query', bookLookupQuerySchema), async (context) => {
      const { query } = context.req.valid('query');
      const matches = await listBookLookupMatches(query);
      return context.json({ matches });
    })
    .get('/:id', zValidator('param', bookIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const book = await findBook(id);
      if (book === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ book });
    })
    .post('/', zValidator('json', bookCreateSchema), async (context) => {
      const book = await createBook(context.req.valid('json'), new Date());
      return context.json({ book }, 201);
    })
    .put(
      '/:id',
      zValidator('param', bookIdParamSchema),
      zValidator('json', bookUpdateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const outcome = await patchBook(id, context.req.valid('json'), new Date());
        if (outcome.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ book: outcome.book });
      },
    )
    .delete('/:id', zValidator('param', bookIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const deletedCount = await removeBook(id);
      if (deletedCount === 0) return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
