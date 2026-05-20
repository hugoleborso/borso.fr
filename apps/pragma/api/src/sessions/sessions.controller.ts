/**
 * Sessions endpoints — single-table inheritance over `session.kind`.
 * Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { getSongs } from '../songs/songs.service';
import {
  sessionCreateSchema,
  sessionIdParamSchema,
  sessionUpdateSchema,
} from './sessions.schema';
import {
  buildNextSessionOfflineManifest,
  createSession,
  getSessionById,
  getSessions,
  patchSession,
  removeSession,
} from './sessions.service';

/**
 * Builds the SW pre-cache manifest. Mounted directly on
 * `/api/offline-manifest` at the app level so the SW can read it
 * without going through the sessions sub-router. Spec Q.O.D.
 * *Offline cache scope* = "next session only": the payload lists the
 * catalog endpoint, every song detail, and the next-upcoming
 * session + its setlist URLs.
 */
export function buildOfflineManifestRouter(): Hono {
  const router = new Hono();
  router.get('/', async (context) => {
    const database = getDatabase();
    const [sessions, songs] = await Promise.all([getSessions(database), getSongs(database)]);
    const manifest = buildNextSessionOfflineManifest(sessions, songs, new Date());
    return context.json(manifest);
  });
  return router;
}

export function buildSessionsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const sessions = await getSessions(getDatabase());
    return context.json({ sessions });
  });

  router.get('/:id', zValidator('param', sessionIdParamSchema), async (context) => {
    const { id } = context.req.valid('param');
    const session = await getSessionById(getDatabase(), id);
    if (session === null) return context.json({ error: 'not-found' }, 404);
    return context.json({ session });
  });

  router.post('/', zValidator('json', sessionCreateSchema), async (context) => {
    const input = context.req.valid('json');
    const session = await createSession(getDatabase(), input);
    return context.json({ session }, 201);
  });

  router.put(
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
  );

  router.delete('/:id', zValidator('param', sessionIdParamSchema), async (context) => {
    const { id } = context.req.valid('param');
    const ok = await removeSession(getDatabase(), id);
    if (!ok) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  return router;
}
