import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { transitionCommentBodySchema, transitionPairParamSchema } from './transitions.schema';
import {
  getTransitionComment,
  getTransitionComments,
  removeTransitionComment,
  saveTransitionComment,
} from './transitions.service';

// @FollowsBlueprint controller-dispatch
export function buildTransitionCommentsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const comments = await getTransitionComments();
      return context.json({ comments });
    })
    .get('/:a/:b', zValidator('param', transitionPairParamSchema), async (context) => {
      const { a, b } = context.req.valid('param');
      const comment = await getTransitionComment(a, b);
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
        await saveTransitionComment({ songAId: a, songBId: b, comment, now: new Date() });
        return context.json({ songAId: a, songBId: b, comment });
      },
    )
    .delete('/:a/:b', zValidator('param', transitionPairParamSchema), async (context) => {
      const { a, b } = context.req.valid('param');
      const outcome = await removeTransitionComment(a, b);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ songAId: a, songBId: b, deleted: true });
    });
}
