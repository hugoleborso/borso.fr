import { Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import { issueRealtimeTicket } from './realtime.service';

// @FollowsBlueprint controller-dispatch
export function buildRealtimeRouter() {
  return new Hono().use('*', requireMemberSession).get('/ticket', async (context) => {
    return context.json(await issueRealtimeTicket(readMemberId(context), Date.now()));
  });
}
