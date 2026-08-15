/**
 * The shelves endpoints.
 *
 * Ungated for the same reason `books.controller.ts` is: the application has no
 * account model, so there is nobody to authenticate, and the per-stage schema
 * is what separates a preview's rows from production's.
 *
 * The delete route answers with how many books were detached, because the
 * cascade is written in the service rather than enforced by the engine and a
 * reader is entitled to see what the deletion moved.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { shelfCreateSchema, shelfIdParamSchema } from './shelves.schema';
import {
  createShelf,
  findShelf,
  listShelvesSortedByName,
  removeShelf,
  renameShelf,
} from './shelves.service';

// @FollowsBlueprint controller-public-router
export function buildShelvesRouter() {
  return new Hono()
    .get('/', async (context) => {
      const shelves = await listShelvesSortedByName();
      return context.json({ shelves });
    })
    .get('/:id', zValidator('param', shelfIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const shelf = await findShelf(id);
      if (shelf === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ shelf });
    })
    .post('/', zValidator('json', shelfCreateSchema), async (context) => {
      const shelf = await createShelf(context.req.valid('json').name);
      return context.json({ shelf }, 201);
    })
    .put(
      '/:id',
      zValidator('param', shelfIdParamSchema),
      zValidator('json', shelfCreateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const shelf = await renameShelf(id, context.req.valid('json').name);
        if (shelf === null) return context.json({ error: 'not-found' }, 404);
        return context.json({ shelf });
      },
    )
    .delete('/:id', zValidator('param', shelfIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const removal = await removeShelf(id);
      if (removal.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true, detachedBookCount: removal.detachedBookCount });
    });
}
