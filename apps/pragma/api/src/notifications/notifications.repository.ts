import { and, eq, inArray } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { retryingConflictAborts } from '../helpers/persistence/conflict-abort.core';
import { memberTable } from '../members/members.schema';
import type { CategoryPreference, NotificationCategory } from './notifications.core';
import {
  notificationDispatchTable,
  notificationPreferenceTable,
  pushSubscriptionTable,
  vapidKeyPairTable,
} from './notifications.schema';

export type PushSubscriptionRow = typeof pushSubscriptionTable.$inferSelect;
export type PushSubscriptionInsertShape = PushSubscriptionRow;
export type VapidKeyPairRow = Omit<typeof vapidKeyPairTable.$inferSelect, 'id'>;

const VAPID_KEY_PAIR_ID = 1;

const SUBSCRIPTION_PROJECTION = {
  memberId: pushSubscriptionTable.memberId,
  endpoint: pushSubscriptionTable.endpoint,
  p256dh: pushSubscriptionTable.p256dh,
  auth: pushSubscriptionTable.auth,
  createdAt: pushSubscriptionTable.createdAt,
} as const;

const PREFERENCE_PROJECTION = {
  memberId: notificationPreferenceTable.memberId,
  category: notificationPreferenceTable.category,
  enabled: notificationPreferenceTable.enabled,
} as const;

// @FollowsBlueprint repository-idempotent-upsert
export async function saveSubscription(values: PushSubscriptionInsertShape): Promise<void> {
  await getDatabase()
    .insert(pushSubscriptionTable)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscriptionTable.endpoint,
      set: { memberId: values.memberId, p256dh: values.p256dh, auth: values.auth },
    });
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await getDatabase()
    .delete(pushSubscriptionTable)
    .where(eq(pushSubscriptionTable.endpoint, endpoint));
}

export async function deleteSubscriptions(endpoints: readonly string[]): Promise<void> {
  if (endpoints.length === 0) return;
  await getDatabase()
    .delete(pushSubscriptionTable)
    .where(inArray(pushSubscriptionTable.endpoint, [...endpoints]));
}

export async function listSubscriptions(): Promise<PushSubscriptionRow[]> {
  return await getDatabase().select(SUBSCRIPTION_PROJECTION).from(pushSubscriptionTable);
}

export async function listPreferencesOfMember(memberId: string): Promise<CategoryPreference[]> {
  return await getDatabase()
    .select(PREFERENCE_PROJECTION)
    .from(notificationPreferenceTable)
    .where(eq(notificationPreferenceTable.memberId, memberId));
}

export async function listPreferencesOfCategory(
  category: NotificationCategory,
): Promise<CategoryPreference[]> {
  return await getDatabase()
    .select(PREFERENCE_PROJECTION)
    .from(notificationPreferenceTable)
    .where(eq(notificationPreferenceTable.category, category));
}

export async function savePreference(preference: CategoryPreference): Promise<void> {
  await getDatabase()
    .insert(notificationPreferenceTable)
    .values(preference)
    .onConflictDoUpdate({
      target: [notificationPreferenceTable.memberId, notificationPreferenceTable.category],
      set: { enabled: preference.enabled },
    });
}

export async function findMemberFirstName(memberId: string): Promise<string | null> {
  const [member] = await getDatabase()
    .select({ firstName: memberTable.firstName })
    .from(memberTable)
    .where(eq(memberTable.id, memberId));
  return member?.firstName ?? null;
}

export async function findDispatchLastSentAt(groupKey: string): Promise<Date | null> {
  const [dispatch] = await getDatabase()
    .select({ lastSentAt: notificationDispatchTable.lastSentAt })
    .from(notificationDispatchTable)
    .where(eq(notificationDispatchTable.groupKey, groupKey));
  return dispatch?.lastSentAt ?? null;
}

async function hasClaimedFirstDispatch(groupKey: string, now: Date): Promise<boolean> {
  const claimed = await getDatabase()
    .insert(notificationDispatchTable)
    .values({ groupKey, lastSentAt: now })
    .onConflictDoNothing()
    .returning({ groupKey: notificationDispatchTable.groupKey });
  return claimed.length > 0;
}

// @FollowsBlueprint repository-conditional-claim
export async function hasClaimedDispatch(
  groupKey: string,
  previousSentAt: Date | null,
  now: Date,
): Promise<boolean> {
  if (previousSentAt === null) return await hasClaimedFirstDispatch(groupKey, now);
  const claimed = await getDatabase()
    .update(notificationDispatchTable)
    .set({ lastSentAt: now })
    .where(
      and(
        eq(notificationDispatchTable.groupKey, groupKey),
        eq(notificationDispatchTable.lastSentAt, previousSentAt),
      ),
    )
    .returning({ groupKey: notificationDispatchTable.groupKey });
  return claimed.length > 0;
}

export async function deletePushStateOfMemberWithin(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await executor.delete(pushSubscriptionTable).where(eq(pushSubscriptionTable.memberId, memberId));
  await executor
    .delete(notificationPreferenceTable)
    .where(eq(notificationPreferenceTable.memberId, memberId));
}

export async function findVapidKeyPair(): Promise<VapidKeyPairRow | null> {
  const [pair] = await getDatabase()
    .select({ publicKey: vapidKeyPairTable.publicKey, privateKey: vapidKeyPairTable.privateKey })
    .from(vapidKeyPairTable)
    .where(eq(vapidKeyPairTable.id, VAPID_KEY_PAIR_ID));
  return pair ?? null;
}

export async function insertVapidKeyPairUnlessPresent(pair: VapidKeyPairRow): Promise<void> {
  await retryingConflictAborts(
    async () =>
      await getDatabase()
        .insert(vapidKeyPairTable)
        .values({ id: VAPID_KEY_PAIR_ID, ...pair })
        .onConflictDoNothing(),
  );
}
