/**
 * Sessions endpoints — single-table inheritance over `session.kind`.
 * Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { sessionCreateSchema, sessionIdParamSchema, sessionUpdateSchema } from './sessions.schema';
import {
  createSession,
  getNextSessionOfflineManifest,
  getSessionById,
  getSessions,
  patchSession,
  removeSession,
} from './sessions.service';

export function buildOfflineManifestRouter() {
  return new Hono().use('*', requireSharedPasswordSession).get('/', async (context) => {
    const manifest = await getNextSessionOfflineManifest(new Date());
    return context.json(manifest);
  });
}

// @FollowsBlueprint controller-dispatch
export function buildSessionsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const sessions = await getSessions();
      return context.json({ sessions });
    })
    .get('/:id', zValidator('param', sessionIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const session = await getSessionById(id);
      if (session === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ session });
    })
    .post('/', zValidator('json', sessionCreateSchema), async (context) => {
      const input = context.req.valid('json');
      const session = await createSession(input);
      return context.json({ session }, 201);
    })
    .put(
      '/:id',
      zValidator('param', sessionIdParamSchema),
      zValidator('json', sessionUpdateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await patchSession(id, input);
        if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ session: result.session });
      },
    )
    .delete('/:id', zValidator('param', sessionIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeSession(id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
