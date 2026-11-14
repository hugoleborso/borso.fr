import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import {
  sketchClipCreateSchema,
  sketchClipMoveSchema,
  sketchClipPathSchema,
  sketchLaneCreateSchema,
  sketchLanePathSchema,
  sketchLaneRenameSchema,
  sketchPathSchema,
} from './sketches.schema';
import {
  createLane,
  readSketch,
  moveClip,
  placeClip,
  removeClip,
  removeLane,
  renameLane,
} from './sketches.service';

const NOT_FOUND_STATUS = 404;

// @FollowsBlueprint controller-dispatch
export function buildSketchesRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/:compositionId', zValidator('param', sketchPathSchema), async (context) => {
      const outcome = await readSketch(context.req.valid('param').compositionId);
      if (outcome.kind === 'refused')
        return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
      return context.json({ sketch: outcome.sketch });
    })
    .post(
      '/:compositionId/lanes',
      zValidator('param', sketchPathSchema),
      zValidator('json', sketchLaneCreateSchema),
      async (context) => {
        const outcome = await createLane(
          context.req.valid('param').compositionId,
          context.req.valid('json'),
        );
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ lane: outcome.lane }, 201);
      },
    )
    .patch(
      '/:compositionId/lanes/:laneId',
      zValidator('param', sketchLanePathSchema),
      zValidator('json', sketchLaneRenameSchema),
      async (context) => {
        const { compositionId, laneId } = context.req.valid('param');
        const outcome = await renameLane(compositionId, laneId, context.req.valid('json'));
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ lane: outcome.lane });
      },
    )
    .delete(
      '/:compositionId/lanes/:laneId',
      zValidator('param', sketchLanePathSchema),
      async (context) => {
        const { compositionId, laneId } = context.req.valid('param');
        const outcome = await removeLane(compositionId, laneId);
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ id: laneId, deleted: true });
      },
    )
    .post(
      '/:compositionId/clips',
      zValidator('param', sketchPathSchema),
      zValidator('json', sketchClipCreateSchema),
      async (context) => {
        const outcome = await placeClip(
          context.req.valid('param').compositionId,
          context.req.valid('json'),
        );
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ clip: outcome.clip }, 201);
      },
    )
    .patch(
      '/:compositionId/clips/:clipId',
      zValidator('param', sketchClipPathSchema),
      zValidator('json', sketchClipMoveSchema),
      async (context) => {
        const { compositionId, clipId } = context.req.valid('param');
        const outcome = await moveClip(compositionId, clipId, context.req.valid('json'));
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ clip: outcome.clip });
      },
    )
    .delete(
      '/:compositionId/clips/:clipId',
      zValidator('param', sketchClipPathSchema),
      async (context) => {
        const { compositionId, clipId } = context.req.valid('param');
        const outcome = await removeClip(compositionId, clipId);
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ id: clipId, deleted: true });
      },
    );
}
