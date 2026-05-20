/**
 * Catalog endpoints. Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import {
  songCreateInputSchema,
  songIdParamSchema,
  songUpdateInputSchema,
} from './songs.schema';
import { createSong, getSongById, getSongs, patchSong, removeSong } from './songs.service';

export function buildSongsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const songs = await getSongs(getDatabase());
    return context.json({ songs });
  });

  router.get('/:id', zValidator('param', songIdParamSchema), async (context) => {
    const { id } = context.req.valid('param');
    const song = await getSongById(getDatabase(), id);
    if (song === null) return context.json({ error: 'not-found' }, 404);
    return context.json({ song });
  });

  router.post('/', zValidator('json', songCreateInputSchema), async (context) => {
    const input = context.req.valid('json');
    const song = await createSong(getDatabase(), input);
    return context.json({ song }, 201);
  });

  router.put(
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
  );

  router.delete('/:id', zValidator('param', songIdParamSchema), async (context) => {
    const { id } = context.req.valid('param');
    const ok = await removeSong(getDatabase(), id);
    if (!ok) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  return router;
}
