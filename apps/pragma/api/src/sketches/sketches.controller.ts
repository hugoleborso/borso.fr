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
  getSketch,
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
    .get('/:songId', zValidator('param', sketchPathSchema), async (context) => {
      const outcome = await getSketch(context.req.valid('param').songId);
      if (outcome.kind === 'refused')
        return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
      return context.json({ sketch: outcome.sketch });
    })
    .post(
      '/:songId/lanes',
      zValidator('param', sketchPathSchema),
      zValidator('json', sketchLaneCreateSchema),
      async (context) => {
        const outcome = await createLane(
          context.req.valid('param').songId,
          context.req.valid('json'),
        );
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ lane: outcome.lane }, 201);
      },
    )
    .patch(
      '/:songId/lanes/:laneId',
      zValidator('param', sketchLanePathSchema),
      zValidator('json', sketchLaneRenameSchema),
      async (context) => {
        const { songId, laneId } = context.req.valid('param');
        const outcome = await renameLane(songId, laneId, context.req.valid('json'));
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ lane: outcome.lane });
      },
    )
    .delete(
      '/:songId/lanes/:laneId',
      zValidator('param', sketchLanePathSchema),
      async (context) => {
        const { songId, laneId } = context.req.valid('param');
        const outcome = await removeLane(songId, laneId);
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ id: laneId, deleted: true });
      },
    )
    .post(
      '/:songId/clips',
      zValidator('param', sketchPathSchema),
      zValidator('json', sketchClipCreateSchema),
      async (context) => {
        const outcome = await placeClip(
          context.req.valid('param').songId,
          context.req.valid('json'),
        );
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ clip: outcome.clip }, 201);
      },
    )
    .patch(
      '/:songId/clips/:clipId',
      zValidator('param', sketchClipPathSchema),
      zValidator('json', sketchClipMoveSchema),
      async (context) => {
        const { songId, clipId } = context.req.valid('param');
        const outcome = await moveClip(songId, clipId, context.req.valid('json'));
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ clip: outcome.clip });
      },
    )
    .delete(
      '/:songId/clips/:clipId',
      zValidator('param', sketchClipPathSchema),
      async (context) => {
        const { songId, clipId } = context.req.valid('param');
        const outcome = await removeClip(songId, clipId);
        if (outcome.kind === 'refused')
          return context.json({ error: outcome.reason }, NOT_FOUND_STATUS);
        return context.json({ id: clipId, deleted: true });
      },
    );
}
