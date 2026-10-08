import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { listOpenCommitments } from './commitments.service';

// @FollowsBlueprint controller-guarded-router
export function buildCommitmentsRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json({ items: await listOpenCommitments() }));
}
