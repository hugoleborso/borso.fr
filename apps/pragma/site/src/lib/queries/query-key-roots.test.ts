import { expandReadRoots, WRITTEN_API_ROOTS } from '@domain/stale-scope.core';
import { describe, expect, it } from 'vitest';
import { QUERY_READ_ROOTS } from './query-read-roots.core';

const QUERY_SOURCES: Record<string, unknown> = import.meta.glob('./*.queries.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const KEY_FACTORY = /export const (\w+Keys) = \{([\s\S]*?)\n\};/g;
const FIRST_STRING_LITERAL = /'([^']+)'/;
const CACHED_QUERY_KEY = /(?:^\s*|useQuery\(\{\s*)queryKey:\s*(\w+Keys)\./gm;
const API_READ = /api\.api(?:\.(\w+)|\['([\w-]+)'\])(?:\.\w+|\['[^']*'\])*\.\$get\(/g;
const MODULE_NAME = /^\.\/(.+)\.queries\.ts$/;

const UNCACHED_MODULES = new Set(['realtime']);
const WRITTEN_ROOTS_NO_QUERY_READS: readonly string[] = [];

interface QueryModule {
  readonly name: string;
  readonly keyRoots: readonly string[];
  readonly apiReads: readonly string[];
}

function listSources(): readonly { readonly name: string; readonly source: string }[] {
  return Object.entries(QUERY_SOURCES).flatMap(([path, source]) =>
    typeof source === 'string' ? [{ name: MODULE_NAME.exec(path)?.[1] ?? path, source }] : [],
  );
}

function readKeyFactories(): ReadonlyMap<string, string> {
  return new Map(
    listSources().flatMap(({ source }) =>
      [...source.matchAll(KEY_FACTORY)].flatMap((match) => {
        const root = FIRST_STRING_LITERAL.exec(match[2] ?? '')?.[1];
        return match[1] === undefined || root === undefined ? [] : [[match[1], root] as const];
      }),
    ),
  );
}

function readQueryModules(): readonly QueryModule[] {
  const factories = readKeyFactories();
  return listSources().map(({ name, source }) => ({
    name,
    keyRoots: [
      ...new Set(
        [...source.matchAll(CACHED_QUERY_KEY)].flatMap(
          (match) => factories.get(match[1] ?? '') ?? [],
        ),
      ),
    ],
    apiReads: [
      ...new Set([...source.matchAll(API_READ)].map((match) => match[1] ?? match[2] ?? '')),
    ],
  }));
}

function readQueryReads(keyRoot: string): readonly string[] {
  return QUERY_READ_ROOTS[keyRoot] ?? [];
}

// @FollowsBlueprint test-pure-unit
describe('the API roots each site query reads', () => {
  it('reads the key roots and API reads of every query module, through another module’s factory too', () => {
    const modules = readQueryModules();
    expect(modules.find((module) => module.name === 'studies')).toStrictEqual({
      name: 'studies',
      keyRoots: ['studies'],
      apiReads: ['studies', 'mastery'],
    });
    expect(modules.find((module) => module.name === 'setlist-entries')?.keyRoots).toStrictEqual([
      'setlists',
    ]);
    expect(modules.find((module) => module.name === 'voting')?.apiReads).toStrictEqual([
      'setlists',
    ]);
  });

  it('gives exactly the key roots the site caches under a row of read roots', () => {
    const keyRoots = new Set(readQueryModules().flatMap((module) => module.keyRoots));
    expect(Object.keys(QUERY_READ_ROOTS).toSorted()).toStrictEqual([...keyRoots].toSorted());
  });

  it('lists under each key root every API root its query module reads', () => {
    const unlisted = readQueryModules().flatMap((module) =>
      module.keyRoots.flatMap((keyRoot) =>
        module.apiReads
          .filter((apiRoot) => !readQueryReads(keyRoot).some((listed) => listed === apiRoot))
          .map((apiRoot) => `${keyRoot} misses ${apiRoot} (read in ${module.name}.queries.ts)`),
      ),
    );
    expect(unlisted).toStrictEqual([]);
  });

  it('caches every module that reads, unless it is named as uncached', () => {
    const uncached = readQueryModules()
      .filter((module) => module.apiReads.length > 0 && module.keyRoots.length === 0)
      .map((module) => module.name);
    expect(uncached).toStrictEqual([...UNCACHED_MODULES]);
  });

  it('reads every root the API can announce from some query, or names it as read by none', () => {
    const readRoots = new Set(
      Object.values(QUERY_READ_ROOTS).flatMap((reads) => [...expandReadRoots(reads)]),
    );
    const unread = WRITTEN_API_ROOTS.filter((root) => !readRoots.has(root));
    expect(unread).toStrictEqual(WRITTEN_ROOTS_NO_QUERY_READS);
  });
});
