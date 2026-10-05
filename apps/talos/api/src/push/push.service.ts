import { TalosError } from '../helpers/errors/talos-error.types';
import { readTalosSecret } from '../helpers/secrets/secrets.setup';
import {
  buildPushPayload,
  type DeliveryReport,
  type PushMessage,
  selectExpiredEndpoints,
  selectPushUrgency,
  summarizeDeliveries,
  TEST_PUSH,
} from './push.core';
import { deleteSubscription, listSubscriptions, saveSubscription } from './push.repository';
import type { PushSubscriptionInput } from './push.schema';
import { deliverWebPush, type VapidKeys } from './web-push.adapter';

export type { DeliveryReport, PushMessage } from './push.core';

async function readVapidKeys(): Promise<VapidKeys> {
  const [publicKey, privateKey] = await Promise.all([
    readTalosSecret('vapid-public'),
    readTalosSecret('vapid-private'),
  ]);
  if (publicKey === undefined || privateKey === undefined) throw new TalosError('not-configured');
  return { publicKey, privateKey };
}

// @FollowsBlueprint service-orchestration
export async function readVapidPublicKey(): Promise<{ key: string }> {
  return { key: (await readVapidKeys()).publicKey };
}

export async function subscribeToPush(
  subscription: PushSubscriptionInput,
  now: Date,
): Promise<void> {
  await saveSubscription({
    endpoint: subscription.endpoint,
    publicKey: subscription.keys.p256dh,
    authenticationSecret: subscription.keys.auth,
    createdAt: now,
  });
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await deleteSubscription(endpoint);
}

export async function pushToEverySubscription(push: PushMessage): Promise<DeliveryReport> {
  const vapidKeys = await readVapidKeys();
  const pushPayload = buildPushPayload(push);
  const urgency = selectPushUrgency(push);
  const subscriptions = await listSubscriptions();
  const deliveries = await Promise.all(
    subscriptions.map(
      async (subscription) =>
        await deliverWebPush(subscription, pushPayload, { vapidKeys, urgency }),
    ),
  );
  await Promise.all(selectExpiredEndpoints(subscriptions, deliveries).map(deleteSubscription));
  return summarizeDeliveries(deliveries);
}

export async function sendTestPush(): Promise<DeliveryReport & { ok: true }> {
  return { ok: true, ...(await pushToEverySubscription(TEST_PUSH)) };
}
