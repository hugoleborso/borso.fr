import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { pushSubscriptionTable } from './push.schema';

export type PushSubscriptionRow = typeof pushSubscriptionTable.$inferSelect;

// @FollowsBlueprint repository-idempotent-upsert
export async function saveSubscription(values: PushSubscriptionRow): Promise<void> {
  await getDatabase()
    .insert(pushSubscriptionTable)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscriptionTable.endpoint,
      set: { publicKey: values.publicKey, authenticationSecret: values.authenticationSecret },
    });
}

export async function listSubscriptions(): Promise<PushSubscriptionRow[]> {
  return await getDatabase().select().from(pushSubscriptionTable);
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await getDatabase()
    .delete(pushSubscriptionTable)
    .where(eq(pushSubscriptionTable.endpoint, endpoint));
}
