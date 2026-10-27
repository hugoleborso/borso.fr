import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import {
  takeCommentCreateSchema,
  takeCommentPathSchema,
  takeCommentUpdateSchema,
  takeCreateSchema,
  takeListQuerySchema,
  takePathSchema,
  takeSignSchema,
} from './takes.schema';
import {
  createTake,
  createTakeComment,
  getCommentsOfTake,
  getTakesOfSong,
  mintTakeUpload,
  patchTakeComment,
  removeTake,
  removeTakeComment,
} from './takes.service';

const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-dispatch
export function buildTakesRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .post('/sign', zValidator('json', takeSignSchema), async (context) => {
      const outcome = await mintTakeUpload(context.req.valid('json'), readNow());
      if (outcome.kind === 'song-not-found') {
        return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
      }
      return context.json({
        uploadUrl: outcome.uploadUrl,
        objectKey: outcome.objectKey,
        expiresAt: outcome.expiresAt,
      });
    })
    .post('/', zValidator('json', takeCreateSchema), async (context) => {
      const outcome = await createTake(context.req.valid('json'), {
        memberId: readMemberId(context),
        now: readNow(),
      });
      if (outcome.kind === 'object-key-mismatch') {
        return context.json({ error: outcome.kind }, UNPROCESSABLE_STATUS);
      }
      if (outcome.kind === 'song-not-found' || outcome.kind === 'session-not-found') {
        return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
      }
      return context.json({ take: outcome.take }, 201);
    })
    .get('/', zValidator('query', takeListQuerySchema), async (context) => {
      const takes = await getTakesOfSong(context.req.valid('query').songId);
      return context.json({ takes });
    })
    .delete('/:id', zValidator('param', takePathSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeTake(id);
      if (outcome === 'not-found') return context.json({ error: outcome }, NOT_FOUND_STATUS);
      return context.json({ id, deleted: true });
    })
    .get('/:id/comments', zValidator('param', takePathSchema), async (context) => {
      const outcome = await getCommentsOfTake(context.req.valid('param').id);
      if (outcome.kind === 'take-not-found') {
        return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
      }
      return context.json({ comments: outcome.comments });
    })
    .post(
      '/:id/comments',
      zValidator('param', takePathSchema),
      zValidator('json', takeCommentCreateSchema),
      async (context) => {
        const outcome = await createTakeComment(
          context.req.valid('param').id,
          context.req.valid('json'),
          { memberId: readMemberId(context), now: readNow() },
        );
        if (outcome.kind === 'moment-past-end') {
          return context.json({ error: outcome.kind }, UNPROCESSABLE_STATUS);
        }
        if (outcome.kind !== 'ok') return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
        return context.json({ comment: outcome.comment }, 201);
      },
    )
    .patch(
      '/:id/comments/:commentId',
      zValidator('param', takeCommentPathSchema),
      zValidator('json', takeCommentUpdateSchema),
      async (context) => {
        const { id, commentId } = context.req.valid('param');
        const outcome = await patchTakeComment(id, commentId, context.req.valid('json'));
        if (outcome.kind === 'moment-past-end') {
          return context.json({ error: outcome.kind }, UNPROCESSABLE_STATUS);
        }
        if (outcome.kind !== 'ok') return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
        return context.json({ comment: outcome.comment });
      },
    )
    .delete(
      '/:id/comments/:commentId',
      zValidator('param', takeCommentPathSchema),
      async (context) => {
        const { id, commentId } = context.req.valid('param');
        const outcome = await removeTakeComment(id, commentId);
        if (outcome === 'not-found') return context.json({ error: outcome }, NOT_FOUND_STATUS);
        return context.json({ id: commentId, deleted: true });
      },
    );
}
