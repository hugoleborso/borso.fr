import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { jsonRequest, signIn } from '../../../test/auth-utils';
import { countReviewEvents, truncateAllTables } from '../../../test/database-utils';
import { FIXTURE_OPERATOR_PASSWORD } from './test-seed-fixture.core';

const summarySchema = z.object({ operatorPassword: z.string(), reviewEvents: z.number() });

// @FollowsBlueprint test-back-e2e
describe('the preview seed route', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('answers 404 when the stage did not set ALLOW_TEST_SEED', async () => {
    vi.stubEnv('ALLOW_TEST_SEED', '');
    const response = await jsonRequest(createApp(), 'POST', '/api/__test/seed');
    expect(response.status).toBe(404);
    expect(await countReviewEvents()).toBe(0);
  });

  it('writes the credential and the fixture events, twice without a duplicate', async () => {
    vi.stubEnv('ALLOW_TEST_SEED', '1');
    const app = createApp();
    const first = await jsonRequest(app, 'POST', '/api/__test/seed');
    expect(first.status).toBe(200);
    expect(summarySchema.parse(await first.json())).toEqual({
      operatorPassword: FIXTURE_OPERATOR_PASSWORD,
      reviewEvents: 28,
    });
    expect((await jsonRequest(app, 'POST', '/api/__test/seed')).status).toBe(200);
    expect(await countReviewEvents()).toBe(28);
    expect((await signIn(app, FIXTURE_OPERATOR_PASSWORD)).status).toBe(200);
  });
});
