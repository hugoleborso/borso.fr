/**
 * App-routing audit. The single security-critical assertion:
 * `__test/` endpoints are mounted only when LASTLOOP_ALLOW_TEST_SEED='1'.
 *
 * The CDK template test (`cdk/test/stack.test.ts`) covers the deploy-time
 * side (prod stack never sets the env var); this test covers the runtime
 * side (even if the var were set in prod, the controller code reads it
 * and decides).
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';

const TEST_SEED_FLAG = 'LASTLOOP_ALLOW_TEST_SEED';

describe('createApp — test-seed routing flag', () => {
  const originalFlag = process.env[TEST_SEED_FLAG];

  beforeAll(() => {
    delete process.env[TEST_SEED_FLAG];
  });

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env[TEST_SEED_FLAG];
    } else {
      process.env[TEST_SEED_FLAG] = originalFlag;
    }
  });

  afterEach(() => {
    delete process.env[TEST_SEED_FLAG];
  });

  it('returns 404 on /api/__test/seed when the flag is absent', async () => {
    const app = createApp();
    const response = await app.request('/api/__test/seed', { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('returns 404 on /api/__test/seed when the flag is set to a non-"1" value', async () => {
    process.env[TEST_SEED_FLAG] = 'true';
    const app = createApp();
    const response = await app.request('/api/__test/seed', { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('mounts /api/__test/seed (non-404) when the flag is "1"', async () => {
    process.env[TEST_SEED_FLAG] = '1';
    const app = createApp();
    const response = await app.request('/api/__test/seed?fixture=race-down-to-one-survivor', { method: 'POST' });
    expect(response.status).not.toBe(404);
  });

  it('always serves /api/health', async () => {
    const app = createApp();
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });
});
