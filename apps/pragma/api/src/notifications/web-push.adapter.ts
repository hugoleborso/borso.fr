/**
 * @DependsOnExternal web-push
 * @DependsOnExternal aws-ssm
 */

import webPush from 'web-push';
import { readSecureParameter } from '../helpers/secrets/parameter-store.client';
import {
  classifyPushFailure,
  type PushDeliveryOutcome,
  readPushFailureStatus,
} from './notifications.core';

export interface VapidKeys {
  readonly publicKey: string;
  readonly privateKey: string;
}

export interface PushTarget {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

export type PushSender = typeof webPush.sendNotification;
export type ParameterReader = (parameterName: string) => Promise<string | undefined>;

export interface DeliverPushOptions {
  readonly vapidKeys: VapidKeys;
  readonly sender?: PushSender;
}

const VAPID_SUBJECT = 'https://pragma.borso.fr';
const TIME_TO_LIVE_SECONDS = 24 * 60 * 60;
const PUSH_SOCKET_TIMEOUT_MILLISECONDS = 3_000;
const PUSH_URGENCY = 'normal';
const VAPID_PUBLIC_PARAMETER_VARIABLE = 'VAPID_PUBLIC_PARAMETER';
const VAPID_PRIVATE_PARAMETER_VARIABLE = 'VAPID_PRIVATE_PARAMETER';
const DELIVERED: PushDeliveryOutcome = { delivery: 'delivered', statusCode: null };

async function readNamedParameter(
  variable: string,
  readParameter: ParameterReader,
): Promise<string | undefined> {
  const parameterName = process.env[variable];
  if (parameterName === undefined || parameterName === '') return undefined;
  const value = await readParameter(parameterName);
  return value === '' ? undefined : value;
}

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export async function readVapidKeys(
  readParameter: ParameterReader = readSecureParameter,
): Promise<VapidKeys | null> {
  const [publicKey, privateKey] = await Promise.all([
    readNamedParameter(VAPID_PUBLIC_PARAMETER_VARIABLE, readParameter),
    readNamedParameter(VAPID_PRIVATE_PARAMETER_VARIABLE, readParameter),
  ]);
  if (publicKey === undefined || privateKey === undefined) return null;
  return { publicKey, privateKey };
}

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export async function deliverWebPush(
  target: PushTarget,
  payload: string,
  options: DeliverPushOptions,
): Promise<PushDeliveryOutcome> {
  const sender = options.sender ?? webPush.sendNotification.bind(webPush);
  try {
    await sender(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      payload,
      {
        vapidDetails: {
          subject: VAPID_SUBJECT,
          publicKey: options.vapidKeys.publicKey,
          privateKey: options.vapidKeys.privateKey,
        },
        urgency: PUSH_URGENCY,
        TTL: TIME_TO_LIVE_SECONDS,
        timeout: PUSH_SOCKET_TIMEOUT_MILLISECONDS,
      },
    );
    return DELIVERED;
  } catch (error) {
    return { delivery: classifyPushFailure(error), statusCode: readPushFailureStatus(error) };
  }
}
