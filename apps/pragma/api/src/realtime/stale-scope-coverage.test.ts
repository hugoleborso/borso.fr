import { isReadMethod, UNANNOUNCED_API_ROOTS, WRITTEN_API_ROOTS } from '@domain/stale-scope.core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { isSilentWrite, SILENT_WRITE_PATHS, selectWrittenRoot } from './stale-scope.core';

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';
const TEST_SEED_FLAG_ON = '1';
const MIDDLEWARE_METHOD = 'ALL';
const API_PREFIX = '/api/';

function listMountedRoutes(): readonly { readonly method: string; readonly path: string }[] {
  return createApp().routes.filter((route) => route.method !== MIDDLEWARE_METHOD);
}

function listMountedWrites(): readonly { readonly method: string; readonly path: string }[] {
  return listMountedRoutes().filter((route) => !isReadMethod(route.method));
}

// @FollowsBlueprint test-back-e2e
describe('the root every write the API serves announces', () => {
  beforeAll(() => {
    vi.stubEnv(TEST_SEED_FLAG, TEST_SEED_FLAG_ON);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('decides every write route, so a new slice cannot ship without saying what it writes', () => {
    const undecided = listMountedWrites()
      .filter((route) => !isSilentWrite(route.path))
      .filter((route) => selectWrittenRoot(route.method, route.path) === null)
      .map((route) => `${route.method} ${route.path}`);
    expect(undecided).toStrictEqual([]);
  });

  it('lists as written exactly the roots some announced write touches', () => {
    const announced = new Set(
      listMountedWrites().flatMap((route) => selectWrittenRoot(route.method, route.path) ?? []),
    );
    expect(WRITTEN_API_ROOTS.filter((root) => !announced.has(root))).toStrictEqual([]);
  });

  it('lists as unannounced only mounted roots that are not also written', () => {
    const mountedPaths = listMountedRoutes().map((route) => route.path);
    const written: ReadonlySet<string> = new Set(WRITTEN_API_ROOTS);
    const misplaced = UNANNOUNCED_API_ROOTS.filter(
      (root) =>
        written.has(root) || !mountedPaths.some((path) => path.startsWith(`${API_PREFIX}${root}`)),
    );
    expect(misplaced).toStrictEqual([]);
  });

  it('keeps no silent path that matches no mounted write', () => {
    const writes = listMountedWrites().map((route) => route.path);
    const unused = SILENT_WRITE_PATHS.map((silent) => `/${silent.join('/')}`).filter(
      (silentPath) => !writes.some((path) => isSilentWrite(path) && path.startsWith(silentPath)),
    );
    expect(unused).toStrictEqual([]);
  });
});
