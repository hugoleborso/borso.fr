import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';

describe('createApp — the seeding route is reachable only where ALLOW_TEST_SEED is exactly "1"', () => {
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

  it('leaves /api/__test/seed unmounted when ALLOW_TEST_SEED is absent, which is how the prod Lambda runs', async () => {
    const app = createApp();
    const response = await app.request('/api/__test/seed', { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('leaves /api/__test/seed unmounted when ALLOW_TEST_SEED carries any value other than "1"', async () => {
    process.env[TEST_SEED_FLAG] = 'true';
    const app = createApp();
    const response = await app.request('/api/__test/seed', { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('mounts /api/__test/seed only when ALLOW_TEST_SEED is exactly "1", which PreviewableApp sets on non-prod Lambdas alone', async () => {
    process.env[TEST_SEED_FLAG] = '1';
    const app = createApp();
    const response = await app.request('/api/__test/seed?fixture=basic-band', {
      method: 'POST',
    });
    expect(response.status).not.toBe(404);
  });

  it('serves /api/health whatever ALLOW_TEST_SEED holds', async () => {
    const app = createApp();
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });
});
