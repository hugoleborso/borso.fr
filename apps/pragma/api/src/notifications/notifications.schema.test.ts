import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  notificationDispatchTable,
  notificationPreferenceTable,
  preferencesUpdateSchema,
  pushSubscriptionInputSchema,
  pushSubscriptionTable,
  pushUnsubscriptionSchema,
} from './notifications.schema';

const SUBSCRIPTION = {
  endpoint: 'https://web.push.apple.com/abc',
  expirationTime: null,
  keys: { p256dh: 'device-key', auth: 'device-auth' },
};

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

describe('pushSubscriptionInputSchema', () => {
  it('accepts the PushSubscriptionJSON of a browser', () => {
    expect(pushSubscriptionInputSchema.parse(SUBSCRIPTION)).toEqual(SUBSCRIPTION);
    expect(
      pushSubscriptionInputSchema.safeParse({
        endpoint: SUBSCRIPTION.endpoint,
        keys: SUBSCRIPTION.keys,
      }).success,
    ).toBe(true);
  });

  it.each([
    ['an endpoint that is not https', { ...SUBSCRIPTION, endpoint: 'http://push.example/abc' }],
    ['an endpoint that is no address', { ...SUBSCRIPTION, endpoint: 'push-service' }],
    ['an endpoint too long', { ...SUBSCRIPTION, endpoint: `https://p.fr/${'x'.repeat(1988)}` }],
    ['an empty device key', { ...SUBSCRIPTION, keys: { p256dh: '', auth: 'x' } }],
    ['an empty secret', { ...SUBSCRIPTION, keys: { p256dh: 'x', auth: '' } }],
    ['a device key too long', { ...SUBSCRIPTION, keys: { p256dh: 'x'.repeat(501), auth: 'x' } }],
  ])('refuses %s', (_label, candidate) => {
    expect(pushSubscriptionInputSchema.safeParse(candidate).success).toBe(false);
  });

  it('accepts an endpoint and a key exactly as long as allowed', () => {
    expect(
      pushSubscriptionInputSchema.safeParse({
        ...SUBSCRIPTION,
        endpoint: `https://p.fr/${'x'.repeat(1987)}`,
        keys: { p256dh: 'x'.repeat(500), auth: 'x' },
      }).success,
    ).toBe(true);
  });
});

describe('pushUnsubscriptionSchema', () => {
  it('asks only for the endpoint', () => {
    expect(pushUnsubscriptionSchema.parse({ endpoint: SUBSCRIPTION.endpoint })).toEqual({
      endpoint: SUBSCRIPTION.endpoint,
    });
    expect(
      pushUnsubscriptionSchema.safeParse({ endpoint: SUBSCRIPTION.endpoint, memberId: 'x' })
        .success,
    ).toBe(false);
  });
});

describe('preferencesUpdateSchema', () => {
  it('takes one toggle of a known category', () => {
    expect(preferencesUpdateSchema.parse({ category: 'take_comments', enabled: false })).toEqual({
      category: 'take_comments',
      enabled: false,
    });
  });

  it.each([
    ['an unknown category', { category: 'emails', enabled: true }],
    ['a toggle that is not a boolean', { category: 'takes', enabled: 'yes' }],
    ['an extra field', { category: 'takes', enabled: true, memberId: 'x' }],
  ])('refuses %s', (_label, candidate) => {
    expect(preferencesUpdateSchema.safeParse(candidate).success).toBe(false);
  });
});
