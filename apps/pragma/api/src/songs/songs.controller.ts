/**
 * Catalog endpoints. Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import {
  externalSearchQuerySchema,
  songCreateInputSchema,
  songIdParamSchema,
  songUpdateInputSchema,
} from './songs.schema';
import {
  createSong,
  getSongById,
  getSongs,
  patchSong,
  removeSong,
  searchExternal,
} from './songs.service';

/**
 * @Blueprint controller-dispatch
 * @BlueprintName Controller Dispatch
 * @BlueprintUsage Use for every Hono route. Validate input, call one service method, shape the response.
 * @BlueprintDescription Builds the song routes. Each handler runs zValidator on the request, calls a single songs.service function, and returns context.json with a status code. No business condition, and no map, filter, or reduce over domain data.
 */
export function buildSongsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const songs = await getSongs();
      return context.json({ songs });
    })
    .get('/search', zValidator('query', externalSearchQuerySchema), async (context) => {
      const { q } = context.req.valid('query');
      const hits = await searchExternal(q);
      return context.json({ hits });
    })
    .get('/:id', zValidator('param', songIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const song = await getSongById(id);
      if (song === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ song });
    })
    .post('/', zValidator('json', songCreateInputSchema), async (context) => {
      const input = context.req.valid('json');
      const song = await createSong(input);
      return context.json({ song }, 201);
    })
    .put(
      '/:id',
      zValidator('param', songIdParamSchema),
      zValidator('json', songUpdateInputSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await patchSong(id, input);
        if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ song: result.song });
      },
    )
    .delete('/:id', zValidator('param', songIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeSong(id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
