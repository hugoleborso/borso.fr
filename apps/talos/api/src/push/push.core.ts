import { z } from 'zod';

export type PushDelivery = 'delivered' | 'expired' | 'failed';

export interface PushMessage {
  readonly title: string;
  readonly message: string;
  readonly urgent?: boolean | undefined;
  readonly url?: string | undefined;
}

export interface DeliveryReport {
  readonly delivered: number;
  readonly removed: number;
}

const NOT_FOUND_STATUS = 404;
const GONE_STATUS = 410;
const EXPIRED_SUBSCRIPTION_STATUSES = new Set([NOT_FOUND_STATUS, GONE_STATUS]);
const DEFAULT_URL = '/';

export const TEST_PUSH: PushMessage = {
  title: 'Talos',
  message: 'Notification de test : les notifications arrivent bien.',
  url: '/settings',
};
const statusCodeSchema = z.object({ statusCode: z.number() });

// @FollowsBlueprint core-decision
export function classifyPushFailure(failure: unknown): PushDelivery {
  const withStatus = statusCodeSchema.safeParse(failure);
  const isExpired =
    withStatus.success && EXPIRED_SUBSCRIPTION_STATUSES.has(withStatus.data.statusCode);
  return isExpired ? 'expired' : 'failed';
}

export function buildPushPayload(push: PushMessage): string {
  return JSON.stringify({
    title: push.title,
    message: push.message,
    url: push.url ?? DEFAULT_URL,
    urgent: push.urgent ?? false,
  });
}

export function selectPushUrgency(push: PushMessage): 'high' | 'normal' {
  return push.urgent === true ? 'high' : 'normal';
}

export function summarizeDeliveries(deliveries: readonly PushDelivery[]): DeliveryReport {
  return {
    delivered: deliveries.filter((delivery) => delivery === 'delivered').length,
    removed: deliveries.filter((delivery) => delivery === 'expired').length,
  };
}

export function selectExpiredEndpoints(
  targets: readonly { readonly endpoint: string }[],
  deliveries: readonly PushDelivery[],
): string[] {
  return targets
    .filter((_, index) => deliveries[index] === 'expired')
    .map((target) => target.endpoint);
}
