/**
 * Catalog endpoints. Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { getDatabase } from '../database/client';
import { songCreateInputSchema, songIdParamSchema, songUpdateInputSchema } from './songs.schema';
import {
  createSong,
  getSongById,
  getSongs,
  patchSong,
  removeSong,
  searchExternal,
} from './songs.service';

const externalSearchQuerySchema = z.object({ q: z.string().min(1).max(256) });

export function buildSongsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const songs = await getSongs(getDatabase());
      return context.json({ songs });
    })
    .get('/search', zValidator('query', externalSearchQuerySchema), async (context) => {
      const { q } = context.req.valid('query');
      const hits = await searchExternal(q);
      return context.json({ hits });
    })
    .get('/:id', zValidator('param', songIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const song = await getSongById(getDatabase(), id);
      if (song === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ song });
    })
    .post('/', zValidator('json', songCreateInputSchema), async (context) => {
      const input = context.req.valid('json');
      const song = await createSong(getDatabase(), input);
      return context.json({ song }, 201);
    })
    .put(
      '/:id',
      zValidator('param', songIdParamSchema),
      zValidator('json', songUpdateInputSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await patchSong(getDatabase(), id, input);
        if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ song: result.song });
      },
    )
    .delete('/:id', zValidator('param', songIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const isOk = await removeSong(getDatabase(), id);
      if (!isOk) return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
