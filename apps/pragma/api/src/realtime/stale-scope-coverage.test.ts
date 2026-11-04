import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { findStaleScopeRule, isReadMethod, STALE_SCOPE_RULES } from './stale-scope.core';

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';
const TEST_SEED_FLAG_ON = '1';
const MIDDLEWARE_METHOD = 'ALL';

function listMountedRoutes(): readonly { readonly method: string; readonly path: string }[] {
  return createApp().routes.filter((route) => route.method !== MIDDLEWARE_METHOD);
}

// @FollowsBlueprint test-back-e2e
describe('the stale scope of every write the API serves', () => {
  beforeAll(() => {
    vi.stubEnv(TEST_SEED_FLAG, TEST_SEED_FLAG_ON);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('decides every write route, so a new slice cannot ship without saying what it makes stale', () => {
    const undecided = listMountedRoutes()
      .filter((route) => !isReadMethod(route.method))
      .filter((route) => findStaleScopeRule(route.path) === null)
      .map((route) => `${route.method} ${route.path}`);
    expect(undecided).toStrictEqual([]);
  });

  it('keeps no rule that matches no mounted route', () => {
    const paths = listMountedRoutes().map((route) => route.path);
    const staleRules = STALE_SCOPE_RULES.filter(
      (rule) => !paths.some((path) => findStaleScopeRule(path, [rule]) !== null),
    ).map((rule) => rule.path.join('/'));
    expect(staleRules).toStrictEqual([]);
  });
});
