import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { messageValidator } from './messages.schema';
import { sendMessageToTalos } from './messages.service';

// @FollowsBlueprint controller-guarded-router
export function buildMessagesRouter() {
  return new Hono()
    .use('*', requireSession)
    .post('/', messageValidator, async (context) =>
      context.json(await sendMessageToTalos(context.req.valid('json').text, new Date())),
    );
}
