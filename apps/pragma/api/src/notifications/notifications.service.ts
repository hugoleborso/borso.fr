import { isConflictAbort } from '../helpers/persistence/conflict-abort.core';
import type { DatabaseExecutor } from '../database/client';
import { reportTaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import {
  buildCategoryToggles,
  buildGroupKey,
  buildNotificationPayload,
  type CategoryToggle,
  countDelivered,
  isGroupDue,
  type NotificationEvent,
  type PushDeliveryOutcome,
  type PushFailureReport,
  selectCategory,
  selectExpiredEndpoints,
  selectFailureReports,
  selectRecipients,
} from './notifications.core';
import {
  deletePushStateOfMemberWithin,
  deleteSubscription,
  deleteSubscriptions,
  findDispatchLastSentAt,
  findMemberFirstName,
  findVapidKeyPair,
  hasClaimedDispatch,
  insertVapidKeyPairUnlessPresent,
  listPreferencesOfCategory,
  listPreferencesOfMember,
  listSubscriptions,
  type PushSubscriptionRow,
  savePreference,
  saveSubscription,
} from './notifications.repository';
import type { PreferencesUpdateInput, PushSubscriptionInput } from './notifications.schema';
import { deliverWebPush, generateVapidKeyPair, type VapidKeys } from './web-push.adapter';

export type { NotificationEvent, WriteActor } from './notifications.core';

export type NotifyOutcome = 'no-recipients' | 'grouped' | 'sent' | 'timed-out' | 'failed';

const PUSH_SEND_DEADLINE_MILLISECONDS = 5_000;
const PUSH_SEND_FAILED = 'PushSendFailed';
const PUSH_SEND_TIMED_OUT = 'PushSendTimedOut';
const NOTIFY_BAND_FAILED = 'NotifyBandFailed';
const UNKNOWN_STATUS = 'none';

async function readVapidKeys(): Promise<VapidKeys> {
  const stored = await findVapidKeyPair();
  if (stored !== null) return stored;
  await insertVapidKeyPairUnlessPresent(generateVapidKeyPair());
  const kept = await findVapidKeyPair();
  if (kept === null) throw new Error('the VAPID key pair is missing after its insert');
  return kept;
}

// @FollowsBlueprint service-orchestration
export async function readVapidPublicKey(): Promise<string> {
  const vapidKeys = await readVapidKeys();
  return vapidKeys.publicKey;
}

export async function subscribeToPush(
  subscription: PushSubscriptionInput,
  command: { readonly memberId: string; readonly now: Date },
): Promise<void> {
  await saveSubscription({
    memberId: command.memberId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    createdAt: command.now,
  });
  recordProductEvent({ event: 'push_subscription_created' });
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await deleteSubscription(endpoint);
}

export async function getPreferences(memberId: string): Promise<CategoryToggle[]> {
  return buildCategoryToggles(await listPreferencesOfMember(memberId));
}

export async function updatePreference(
  memberId: string,
  input: PreferencesUpdateInput,
): Promise<CategoryToggle[]> {
  await savePreference({ memberId, category: input.category, enabled: input.enabled });
  return await getPreferences(memberId);
}

export async function deletePushStateOfDeletedMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deletePushStateOfMemberWithin(executor, memberId);
}

async function hasClaimedGroup(groupKey: string, now: Date): Promise<boolean> {
  const lastSentAt = await findDispatchLastSentAt(groupKey);
  if (!isGroupDue(lastSentAt, now)) return false;
  try {
    return await hasClaimedDispatch(groupKey, lastSentAt, now);
  } catch (error) {
    if (isConflictAbort(error)) return false;
    throw error;
  }
}

async function sendWithinDeadline(
  sends: Promise<PushDeliveryOutcome[]>,
): Promise<PushDeliveryOutcome[] | null> {
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    deadlineTimer = setTimeout(() => {
      resolve(null);
    }, PUSH_SEND_DEADLINE_MILLISECONDS);
  });
  try {
    return await Promise.race([sends, deadline]);
  } finally {
    clearTimeout(deadlineTimer);
  }
}

function reportSendFailures(failures: readonly PushFailureReport[]): void {
  for (const failure of failures) {
    const status = failure.statusCode === null ? UNKNOWN_STATUS : String(failure.statusCode);
    console.warn(JSON.stringify({ event: PUSH_SEND_FAILED, host: failure.host, status }));
    reportTaggedFailure({
      name: PUSH_SEND_FAILED,
      tags: { 'push.host': failure.host, 'push.status': status },
    });
    recordProductEvent({ event: 'push_failed', status });
  }
}

async function deliverToRecipients(
  recipients: readonly PushSubscriptionRow[],
  event: NotificationEvent,
  vapidKeys: VapidKeys,
): Promise<NotifyOutcome> {
  const encodedNotification = JSON.stringify(
    buildNotificationPayload(event, await findMemberFirstName(event.actorMemberId)),
  );
  const outcomes = await sendWithinDeadline(
    Promise.all(
      recipients.map(
        async (recipient) => await deliverWebPush(recipient, encodedNotification, { vapidKeys }),
      ),
    ),
  );
  if (outcomes === null) {
    console.warn(JSON.stringify({ event: PUSH_SEND_TIMED_OUT, recipients: recipients.length }));
    reportTaggedFailure({ name: PUSH_SEND_TIMED_OUT, tags: { 'push.kind': event.kind } });
    return 'timed-out';
  }
  await deleteSubscriptions(selectExpiredEndpoints(recipients, outcomes));
  reportSendFailures(selectFailureReports(recipients, outcomes));
  recordProductEvent({ event: 'push_sent', delivered: countDelivered(outcomes) });
  return 'sent';
}

async function notifyRecipients(event: NotificationEvent, now: Date): Promise<NotifyOutcome> {
  const category = selectCategory(event);
  const [subscriptions, preferences] = await Promise.all([
    listSubscriptions(),
    listPreferencesOfCategory(category),
  ]);
  const recipients = selectRecipients(subscriptions, preferences, {
    actorMemberId: event.actorMemberId,
    category,
  });
  if (recipients.length === 0) return 'no-recipients';
  const vapidKeys = await readVapidKeys();
  if (!(await hasClaimedGroup(buildGroupKey(event), now))) return 'grouped';
  return await deliverToRecipients(recipients, event, vapidKeys);
}

// @FollowsBlueprint service-orchestration
export async function notifyBand(event: NotificationEvent, now: Date): Promise<NotifyOutcome> {
  try {
    return await notifyRecipients(event, now);
  } catch (error) {
    console.warn(JSON.stringify({ event: NOTIFY_BAND_FAILED, kind: event.kind }), error);
    reportTaggedFailure({ name: NOTIFY_BAND_FAILED, tags: { 'push.kind': event.kind } });
    return 'failed';
  }
}

export { defineTool } from '../mcp/mcp.service';
