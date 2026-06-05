/**
 * Sessions endpoints — single-table inheritance over `session.kind`.
 * Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { getDatabase } from '../database/client';
import { getSongs } from '../songs/songs.service';
import { sessionCreateSchema, sessionIdParamSchema, sessionUpdateSchema } from './sessions.schema';
import {
  buildNextSessionOfflineManifest,
  createSession,
  getSessionById,
  getSessions,
  patchSession,
  removeSession,
} from './sessions.service';

export function buildOfflineManifestRouter() {
  return new Hono().use('*', requireSharedPasswordSession).get('/', async (context) => {
    const database = getDatabase();
    const [sessions, songs] = await Promise.all([getSessions(database), getSongs(database)]);
    const manifest = buildNextSessionOfflineManifest(sessions, songs, new Date());
    return context.json(manifest);
  });
}

export function buildSessionsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const sessions = await getSessions(getDatabase());
      return context.json({ sessions });
    })
    .get('/:id', zValidator('param', sessionIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const session = await getSessionById(getDatabase(), id);
      if (session === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ session });
    })
    .post('/', zValidator('json', sessionCreateSchema), async (context) => {
      const input = context.req.valid('json');
      const session = await createSession(getDatabase(), input);
      return context.json({ session }, 201);
    })
    .put(
      '/:id',
      zValidator('param', sessionIdParamSchema),
      zValidator('json', sessionUpdateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await patchSession(getDatabase(), id, input);
        if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ session: result.session });
      },
    )
    .delete('/:id', zValidator('param', sessionIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const ok = await removeSession(getDatabase(), id);
      if (!ok) return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
