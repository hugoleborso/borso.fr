import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import {
  preferencesUpdateSchema,
  pushSubscriptionInputSchema,
  pushUnsubscriptionSchema,
} from './notifications.schema';
import {
  getPreferences,
  readVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  updatePreference,
} from './notifications.service';

const SERVICE_UNAVAILABLE_STATUS = 503;
const PUSH_NOT_CONFIGURED = 'push-not-configured';

// @FollowsBlueprint controller-dispatch
export function buildNotificationsRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/vapid-public-key', async (context) => {
      const outcome = await readVapidPublicKey();
      if (outcome.kind === 'not-configured') {
        return context.json({ error: PUSH_NOT_CONFIGURED }, SERVICE_UNAVAILABLE_STATUS);
      }
      return context.json({ key: outcome.key });
    })
    .post('/subscriptions', zValidator('json', pushSubscriptionInputSchema), async (context) => {
      await subscribeToPush(context.req.valid('json'), {
        memberId: readMemberId(context),
        now: new Date(),
      });
      return context.json({ ok: true }, 201);
    })
    .delete('/subscriptions', zValidator('json', pushUnsubscriptionSchema), async (context) => {
      await unsubscribeFromPush(context.req.valid('json').endpoint);
      return context.json({ ok: true });
    })
    .get('/preferences', async (context) => {
      const preferences = await getPreferences(readMemberId(context));
      return context.json({ preferences });
    })
    .put('/preferences', zValidator('json', preferencesUpdateSchema), async (context) => {
      const preferences = await updatePreference(readMemberId(context), context.req.valid('json'));
      return context.json({ preferences });
    });
}
