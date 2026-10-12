import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { readClaudeCodeTarget } from './messages.service';

// @FollowsBlueprint controller-guarded-router
export function buildMessagesRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/claude-code', async (context) => context.json(await readClaudeCodeTarget()));
}
