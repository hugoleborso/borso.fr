import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  notificationDispatchTable,
  notificationPreferenceTable,
  pushSubscriptionTable,
} from './notifications.schema';

// @FollowsBlueprint test-pure-unit
describe('notification tables', () => {
  it('keep one subscription per push endpoint', () => {
    const [endpointIndex] = getTableConfig(pushSubscriptionTable).indexes;
    expect(endpointIndex?.config.name).toBe('push_subscription_endpoint_idx');
    expect(endpointIndex?.config.unique).toBe(true);
  });

  it('keep one preference per member and category', () => {
    const [preferenceKey] = getTableConfig(notificationPreferenceTable).primaryKeys;
    expect(preferenceKey?.getName()).toBe('notification_preference_pk');
    expect(preferenceKey?.columns.map((column) => column.name)).toEqual(['member_id', 'category']);
  });

  it('key a dispatch on its group', () => {
    expect(getTableConfig(notificationDispatchTable).columns.map((column) => column.name)).toEqual([
      'group_key',
      'last_sent_at',
    ]);
  });
});
