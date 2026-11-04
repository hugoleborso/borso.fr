import { NARROW_STALE_SCOPES } from '@domain/stale-scope.core';
import { describe, expect, it } from 'vitest';

const QUERY_MODULES: Record<string, unknown> = import.meta.glob('./*.queries.ts', { eager: true });

function readKeyRoot(exported: unknown): string | null {
  if (typeof exported !== 'object' || exported === null) return null;
  if (!('all' in exported) || !Array.isArray(exported.all)) return null;
  const [root]: unknown[] = exported.all;
  return typeof root === 'string' ? root : null;
}

function listQueryKeyRoots(): readonly string[] {
  return Object.values(QUERY_MODULES).flatMap((module) =>
    typeof module === 'object' && module !== null
      ? Object.values(module).flatMap((exported) => readKeyRoot(exported) ?? [])
      : [],
  );
}

// @FollowsBlueprint test-pure-unit
describe('the scopes the API can send stale', () => {
  it('reads the key root of every query module', () => {
    expect(listQueryKeyRoots()).toEqual(expect.arrayContaining(['setlists', 'songs', 'auth']));
  });

  it('names only roots the site really keys its queries under, so an invalidation always lands', () => {
    const roots = new Set(listQueryKeyRoots());
    expect(NARROW_STALE_SCOPES.filter((scope) => !roots.has(scope))).toStrictEqual([]);
  });
});
