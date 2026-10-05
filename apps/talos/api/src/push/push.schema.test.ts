import { describe, expect, it } from 'vitest';
import { pushSubscriptionSchema, pushUnsubscriptionSchema } from './push.schema';

const SUBSCRIPTION = {
  endpoint: 'https://web.push.apple.com/abc',
  expirationTime: null,
  keys: { p256dh: 'clé', auth: 'secret' },
};

describe('pushSubscriptionSchema', () => {
  it('accepts the PushSubscriptionJSON of a browser', () => {
    expect(pushSubscriptionSchema.parse(SUBSCRIPTION)).toEqual(SUBSCRIPTION);
  });

  it.each([
    ['an endpoint that is not https', { ...SUBSCRIPTION, endpoint: 'http://push.example/abc' }],
    ['an endpoint too long', { ...SUBSCRIPTION, endpoint: `https://p.fr/${'x'.repeat(2000)}` }],
    ['an empty key', { ...SUBSCRIPTION, keys: { p256dh: '', auth: 'x' } }],
    ['a key too long', { ...SUBSCRIPTION, keys: { p256dh: 'x'.repeat(501), auth: 'x' } }],
  ])('refuses %s', (_label, candidate) => {
    expect(pushSubscriptionSchema.safeParse(candidate).success).toBe(false);
  });

  it('accepts a key exactly as long as allowed', () => {
    expect(
      pushSubscriptionSchema.safeParse({
        ...SUBSCRIPTION,
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
  });
});
