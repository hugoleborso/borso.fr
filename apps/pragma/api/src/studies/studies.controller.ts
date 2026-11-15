import { Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import { readStudiesOverview } from './studies.service';

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-dispatch
export function buildStudiesRouter() {
  return new Hono().use('*', requireMemberSession).get('/overview', async (context) => {
    const overview = await readStudiesOverview(readMemberId(context), readNow());
    return context.json(overview);
  });
}
