import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { pushSubscriptionValidator, pushUnsubscriptionValidator } from './push.schema';
import {
  readVapidPublicKey,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from './push.service';

// @FollowsBlueprint controller-guarded-router
export function buildPushRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/public-key', async (context) => context.json(await readVapidPublicKey()))
    .post('/subscriptions', pushSubscriptionValidator, async (context) => {
      await subscribeToPush(context.req.valid('json'), new Date());
      return context.json({ ok: true });
    })
    .delete('/subscriptions', pushUnsubscriptionValidator, async (context) => {
      await unsubscribeFromPush(context.req.valid('json').endpoint);
      return context.json({ ok: true });
    })
    .post('/test', async (context) => context.json(await sendTestPush()));
}
