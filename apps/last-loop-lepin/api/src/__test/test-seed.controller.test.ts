import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedAdminCredentials, truncateAllTables } from '../../../test/database-utils';
import { createApp } from '../app';
import { findEditionBySlug } from '../edition/edition.repository';
import { listRunnersForEdition } from '../runner/runner.repository';

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';

async function seed(fixture: string) {
  const app = createApp();
  return app.request(`/api/__test/seed?fixture=${encodeURIComponent(fixture)}`, {
    method: 'POST',
  });
}

const VALIDATOR_ADDRESS = '198.51.100.90';
const LOGIN_BUDGET = 5;

async function loginWithWrongPin() {
  return createApp().request(
    '/api/admin/auth/login',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: 'totallywrong' }),
    },
    { event: { requestContext: { http: { sourceIp: VALIDATOR_ADDRESS } } } },
  );
}

// @FollowsBlueprint test-back-e2e
describe('__test/test-seed.controller', () => {
  const originalFlag = process.env[TEST_SEED_FLAG];

  beforeAll(() => {
    process.env[TEST_SEED_FLAG] = '1';
  });

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env[TEST_SEED_FLAG];
    } else {
      process.env[TEST_SEED_FLAG] = originalFlag;
    }
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it('returns 400 on an unknown fixture name', async () => {
    const response = await seed('totally-unknown');
    expect(response.status).toBe(400);
  });

  it('seeds the race-down-to-one-survivor fixture (edition + roster + alice punches)', async () => {
    const response = await seed('race-down-to-one-survivor');
    expect(response.status).toBe(200);
    const edition = await findEditionBySlug('lepin-2026');
    expect(edition).not.toBeNull();
    const runners = await listRunnersForEdition('lepin-2026');
    expect(runners.length).toBeGreaterThanOrEqual(3);
  });

  it('seeds the race-finished fixture (edition + runners + manual DNF)', async () => {
    const response = await seed('race-finished');
    expect(response.status).toBe(200);
    const edition = await findEditionBySlug('lepin-2026');
    expect(edition).not.toBeNull();
  });

  it('lets a validator reopen the admin sign-in after exhausting its budget', async () => {
    await seedAdminCredentials();
    for (let attempt = 0; attempt < LOGIN_BUDGET; attempt += 1) {
      await loginWithWrongPin();
    }
    expect((await loginWithWrongPin()).status).toBe(429);
    const reset = await createApp().request('/api/__test/rate-limits/reset', { method: 'POST' });
    expect(reset.status).toBe(200);
    expect((await loginWithWrongPin()).status).toBe(401);
  });
});
