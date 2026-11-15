import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import { readStreaks } from './streaks.service';

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-dispatch
export function buildStreaksRouter() {
  return new Hono().use('*', requireMemberSession).get('/', async (context) => {
    const streaks = await readStreaks(readNow());
    return context.json(streaks);
  });
}
