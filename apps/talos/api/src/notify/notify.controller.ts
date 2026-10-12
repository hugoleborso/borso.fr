import { Hono } from 'hono';
import { requireNotifySecret } from './notify.middleware';
import { notifyValidator } from './notify.schema';
import { notifyOwner } from './notify.service';

// @FollowsBlueprint controller-guarded-router
export function buildNotifyRouter() {
  return new Hono()
    .use('*', requireNotifySecret)
    .post('/', notifyValidator, async (context) =>
      context.json(await notifyOwner(context.req.valid('json'))),
    );
}
