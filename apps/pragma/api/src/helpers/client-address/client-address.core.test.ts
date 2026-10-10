import { describe, expect, it } from 'vitest';
import {
  isOriginVerified,
  readSourceIp,
  resolveClientAddress,
  UNKNOWN_CLIENT_ADDRESS,
} from './client-address.core';

const ORIGIN_SECRET = 'origin-secret';
const SOURCE_IP = '198.51.100.7';
const VIEWER_ADDRESS = '203.0.113.20';

function lambdaEnvironmentFrom(sourceIp: string): unknown {
  return { event: { requestContext: { http: { sourceIp } } } };
}

// @FollowsBlueprint test-pure-unit
describe('readSourceIp', () => {
  it('reads the TCP peer API Gateway recorded', () => {
    expect(readSourceIp(lambdaEnvironmentFrom(SOURCE_IP))).toBe(SOURCE_IP);
  });

  it('answers undefined outside a Lambda event', () => {
    expect(readSourceIp(undefined)).toBeUndefined();
    expect(readSourceIp({ incoming: {} })).toBeUndefined();
    expect(readSourceIp(lambdaEnvironmentFrom(''))).toBeUndefined();
  });
});

describe('isOriginVerified', () => {
  it('accepts the exact secret only', () => {
    expect(isOriginVerified(ORIGIN_SECRET, ORIGIN_SECRET)).toBe(true);
    expect(isOriginVerified('origin-secreT', ORIGIN_SECRET)).toBe(false);
    expect(isOriginVerified('short', ORIGIN_SECRET)).toBe(false);
  });

  it('refuses when either side is missing or the expected value is empty', () => {
    expect(isOriginVerified(undefined, ORIGIN_SECRET)).toBe(false);
    expect(isOriginVerified(ORIGIN_SECRET, undefined)).toBe(false);
    expect(isOriginVerified('', '')).toBe(false);
  });
});

describe('resolveClientAddress', () => {
  it('trusts the viewer address when the request carries the origin secret', () => {
    expect(
      resolveClientAddress({
        viewerAddressHeader: ` ${VIEWER_ADDRESS} `,
        originVerifyHeader: ORIGIN_SECRET,
        expectedOriginVerify: ORIGIN_SECRET,
        lambdaEnvironment: lambdaEnvironmentFrom(SOURCE_IP),
      }),
    ).toBe(VIEWER_ADDRESS);
  });

  it('ignores a viewer address sent without the origin secret, as a direct caller would', () => {
    expect(
      resolveClientAddress({
        viewerAddressHeader: VIEWER_ADDRESS,
        originVerifyHeader: 'guessed',
        expectedOriginVerify: ORIGIN_SECRET,
        lambdaEnvironment: lambdaEnvironmentFrom(SOURCE_IP),
      }),
    ).toBe(SOURCE_IP);
  });

  it('ignores the viewer address on a stage with no CloudFront in front', () => {
    expect(
      resolveClientAddress({
        viewerAddressHeader: VIEWER_ADDRESS,
        originVerifyHeader: undefined,
        expectedOriginVerify: undefined,
        lambdaEnvironment: lambdaEnvironmentFrom(SOURCE_IP),
      }),
    ).toBe(SOURCE_IP);
  });

  it('falls back to the source address when a verified request has a blank viewer address', () => {
    expect(
      resolveClientAddress({
        viewerAddressHeader: '  ',
        originVerifyHeader: ORIGIN_SECRET,
        expectedOriginVerify: ORIGIN_SECRET,
        lambdaEnvironment: lambdaEnvironmentFrom(SOURCE_IP),
      }),
    ).toBe(SOURCE_IP);
    expect(
      resolveClientAddress({
        viewerAddressHeader: undefined,
        originVerifyHeader: ORIGIN_SECRET,
        expectedOriginVerify: ORIGIN_SECRET,
        lambdaEnvironment: lambdaEnvironmentFrom(SOURCE_IP),
      }),
    ).toBe(SOURCE_IP);
  });

  it('lands on one unknown bucket when no source is available', () => {
    expect(
      resolveClientAddress({
        viewerAddressHeader: undefined,
        originVerifyHeader: undefined,
        expectedOriginVerify: undefined,
        lambdaEnvironment: undefined,
      }),
    ).toBe(UNKNOWN_CLIENT_ADDRESS);
  });
});
