import { describe, expect, it } from 'vitest';
import { isStreakReminderEvent } from './lambda-event.core';

const API_GATEWAY_EVENT = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/api/streaks',
  headers: {},
  requestContext: { http: { method: 'GET', path: '/api/streaks' } },
  isBase64Encoded: false,
};

const FUNCTION_URL_EVENT = {
  version: '2.0',
  rawPath: '/api/health',
  requestContext: { domainName: 'abc.lambda-url.eu-west-3.on.aws' },
};

// @FollowsBlueprint test-pure-unit
describe('isStreakReminderEvent', () => {
  it('routes the payload of the 20:00 schedule to the job', () => {
    expect(isStreakReminderEvent({ job: 'streak-reminder' })).toBe(true);
  });

  it('leaves an API Gateway event to Hono', () => {
    expect(isStreakReminderEvent(API_GATEWAY_EVENT)).toBe(false);
  });

  it('leaves a function URL event to Hono', () => {
    expect(isStreakReminderEvent(FUNCTION_URL_EVENT)).toBe(false);
  });

  it('refuses a job of another name', () => {
    expect(isStreakReminderEvent({ job: 'weekly-digest' })).toBe(false);
  });

  it('refuses the job payload when it carries an extra key', () => {
    expect(isStreakReminderEvent({ job: 'streak-reminder', rawPath: '/api/streaks' })).toBe(false);
  });

  it('refuses a value that is not an object', () => {
    expect(isStreakReminderEvent('streak-reminder')).toBe(false);
    expect(isStreakReminderEvent(null)).toBe(false);
  });
});
