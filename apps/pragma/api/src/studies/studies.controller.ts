import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import { studyLogSchema, studyPathSchema } from './studies.schema';
import { logStudyWithStreaks, readStudiesOverview, undoStudyWithStreaks } from './studies.service';

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-dispatch
export function buildStudiesRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/overview', async (context) => {
      const overview = await readStudiesOverview(readMemberId(context), readNow());
      return context.json(overview);
    })
    .post('/', zValidator('json', studyLogSchema), async (context) => {
      const outcome = await logStudyWithStreaks({
        ...context.req.valid('json'),
        memberId: readMemberId(context),
        now: readNow(),
      });
      if (outcome.kind === 'song-not-found') return context.json({ error: outcome.kind }, 404);
      if (outcome.kind === 'instrument-not-found')
        return context.json({ error: outcome.kind }, 404);
      if (outcome.kind === 'study-not-in-lineup') return context.json({ error: outcome.kind }, 422);
      return context.json({ study: outcome.study, streaks: outcome.streaks }, 201);
    })
    .delete('/:songId/:instrumentId', zValidator('param', studyPathSchema), async (context) => {
      const outcome = await undoStudyWithStreaks({
        ...context.req.valid('param'),
        memberId: readMemberId(context),
        now: readNow(),
      });
      if (outcome.kind === 'study-not-found') return context.json({ error: outcome.kind }, 404);
      return context.json({
        ...context.req.valid('param'),
        deleted: true,
        streaks: outcome.streaks,
      });
    });
}
