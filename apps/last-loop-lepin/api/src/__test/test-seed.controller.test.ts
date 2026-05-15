/**
 * Test-seed controller. The skill-of-the-controller is to insert known
 * fixtures so the visual-validation flow can hit deterministic states
 * without driving the whole admin UI. The security guard (only mount
 * when LASTLOOP_ALLOW_TEST_SEED='1') is asserted in `../app.test.ts`.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { findEditionBySlug } from '../edition/edition.repository';
import { listRunnersForEdition } from '../runner/runner.repository';

const TEST_SEED_FLAG = 'LASTLOOP_ALLOW_TEST_SEED';

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
    await truncateAllTables(freshDatabase());
  });

  async function seed(fixture: string) {
    const app = createApp();
    return app.request(`/api/__test/seed?fixture=${encodeURIComponent(fixture)}`, {
      method: 'POST',
    });
  }

  it('returns 400 on an unknown fixture name', async () => {
    const response = await seed('totally-unknown');
    expect(response.status).toBe(400);
  });

  it('seeds the race-down-to-one-survivor fixture (edition + roster + alice punches)', async () => {
    const response = await seed('race-down-to-one-survivor');
    expect(response.status).toBe(200);

    const database = freshDatabase();
    const edition = await findEditionBySlug(database, 'lepin-2026');
    expect(edition).not.toBeNull();
    const runners = await listRunnersForEdition(database, 'lepin-2026');
    expect(runners.length).toBeGreaterThanOrEqual(3);
  });

  it('seeds the race-finished fixture (edition + runners + manual DNF)', async () => {
    const response = await seed('race-finished');
    expect(response.status).toBe(200);

    const database = freshDatabase();
    const edition = await findEditionBySlug(database, 'lepin-2026');
    expect(edition).not.toBeNull();
  });
});
