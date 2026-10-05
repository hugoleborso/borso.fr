/**
 * @DependsOnExternal web-push
 */

import webPush from 'web-push';
import { classifyPushFailure, type PushDelivery } from './push.core';

export interface VapidKeys {
  readonly publicKey: string;
  readonly privateKey: string;
}

export interface PushTarget {
  readonly endpoint: string;
  readonly publicKey: string;
  readonly authenticationSecret: string;
}

export type PushSender = typeof webPush.sendNotification;

export interface DeliverPushOptions {
  readonly vapidKeys: VapidKeys;
  readonly urgency: 'high' | 'normal';
  readonly sender?: PushSender;
}

const VAPID_SUBJECT = 'https://talos.borso.fr';
const TIME_TO_LIVE_SECONDS = 24 * 60 * 60;

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export async function deliverWebPush(
  target: PushTarget,
  payload: string,
  options: DeliverPushOptions,
): Promise<PushDelivery> {
  const sender = options.sender ?? webPush.sendNotification.bind(webPush);
  try {
    await sender(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.publicKey, auth: target.authenticationSecret },
      },
      payload,
      {
        vapidDetails: {
          subject: VAPID_SUBJECT,
          publicKey: options.vapidKeys.publicKey,
          privateKey: options.vapidKeys.privateKey,
        },
        urgency: options.urgency,
        TTL: TIME_TO_LIVE_SECONDS,
      },
    );
    return 'delivered';
  } catch (error) {
    return classifyPushFailure(error);
  }
}
