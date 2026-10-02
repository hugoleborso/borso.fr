import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import { computeFreeSlots } from './free-slots.service';

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-guarded-router
export function buildFreeSlotsRouter() {
  return new Hono().use('*', requireMemberSession).get('/', async (context) => {
    return context.json(await computeFreeSlots(readNow()));
  });
}
