/**
 * Transition-comment endpoints. Comments are stored on the ordered pair
 * (songA, songB). Hono routing + Zod parsing only; orchestration in
 * the service.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { getDatabase } from '../database/client';
import {
  transitionCommentBodySchema,
  transitionPairParamSchema,
} from './transitions.schema';
import {
  getTransitionComment,
  getTransitionComments,
  removeTransitionComment,
  saveTransitionComment,
} from './transitions.service';

export function buildTransitionCommentsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const comments = await getTransitionComments(getDatabase());
      return context.json({ comments });
    })
    .get('/:a/:b', zValidator('param', transitionPairParamSchema), async (context) => {
      const { a, b } = context.req.valid('param');
      const comment = await getTransitionComment(getDatabase(), a, b);
      if (comment === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ comment });
    })
    .put(
      '/:a/:b',
      zValidator('param', transitionPairParamSchema),
      zValidator('json', transitionCommentBodySchema),
      async (context) => {
        const { a, b } = context.req.valid('param');
        const { comment } = context.req.valid('json');
        await saveTransitionComment(getDatabase(), a, b, comment);
        return context.json({ songAId: a, songBId: b, comment });
      },
    )
    .delete('/:a/:b', zValidator('param', transitionPairParamSchema), async (context) => {
      const { a, b } = context.req.valid('param');
      const ok = await removeTransitionComment(getDatabase(), a, b);
      if (!ok) return context.json({ error: 'not-found' }, 404);
      return context.json({ songAId: a, songBId: b, deleted: true });
    });
}
