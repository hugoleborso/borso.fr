import { describe, expect, it } from 'vitest';
import {
  buildPushPayload,
  classifyPushFailure,
  selectExpiredEndpoints,
  selectPushUrgency,
  summarizeDeliveries,
} from './push.core';

describe('classifyPushFailure', () => {
  it('reads a gone or unknown subscription as expired', () => {
    expect(classifyPushFailure({ statusCode: 410 })).toBe('expired');
    expect(classifyPushFailure({ statusCode: 404 })).toBe('expired');
  });

  it('reads any other failure as a failure to retry later', () => {
    expect(classifyPushFailure({ statusCode: 500 })).toBe('failed');
    expect(classifyPushFailure(new Error('réseau'))).toBe('failed');
  });
});

describe('buildPushPayload', () => {
  it('carries the title, the message, the address and the urgency', () => {
    expect(
      JSON.parse(buildPushPayload({ title: 'T', message: 'M', urgent: true, url: '/todo' })),
    ).toEqual({ title: 'T', message: 'M', url: '/todo', urgent: true });
  });

  it('opens the home screen and stays quiet by default', () => {
    expect(JSON.parse(buildPushPayload({ title: 'T', message: 'M' }))).toEqual({
      title: 'T',
      message: 'M',
      url: '/',
      urgent: false,
    });
  });
});

describe('selectPushUrgency', () => {
  it('asks for high urgency only when the notification is urgent', () => {
    expect(selectPushUrgency({ title: 'T', message: 'M', urgent: true })).toBe('high');
    expect(selectPushUrgency({ title: 'T', message: 'M', urgent: false })).toBe('normal');
    expect(selectPushUrgency({ title: 'T', message: 'M' })).toBe('normal');
  });
});

describe('summarizeDeliveries', () => {
  it('counts the delivered and the removed subscriptions', () => {
    expect(summarizeDeliveries(['delivered', 'expired', 'failed', 'failed'])).toEqual({
      delivered: 1,
      removed: 1,
    });
  });
});

describe('selectExpiredEndpoints', () => {
  it('keeps the endpoints whose delivery says the subscription expired', () => {
    expect(
      selectExpiredEndpoints(
        [{ endpoint: 'a' }, { endpoint: 'b' }, { endpoint: 'c' }],
        ['delivered', 'expired', 'failed'],
      ),
    ).toEqual(['b']);
  });
});
