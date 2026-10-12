import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn, useTestSecrets } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/messages/claude-code', () => {
  it('answers the content repository and both environments from the deployment settings', async () => {
    vi.stubEnv('GITHUB_REPO', 'proprietaire/notes');
    const { app } = buildTestContext({});
    useTestSecrets({
      'claude-environment-talos': 'env_lecture',
      'claude-environment-build': 'env_construction',
    });
    const response = await requestJson(app, '/api/messages/claude-code', {
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      repository: 'proprietaire/notes',
      environments: { talos: 'env_lecture', build: 'env_construction' },
    });
  });

  it('answers null environments while the settings are not set', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/messages/claude-code', {
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({ environments: { talos: null, build: null } });
  });

  it('refuses a caller without a session', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/messages/claude-code');
    expect(response.status).toBe(401);
  });
});
