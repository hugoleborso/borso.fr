import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ApiRoot, DERIVED_READ_ROOTS } from '@domain/stale-scope.core';
import { describe, expect, it } from 'vitest';

const SOURCE_FOLDER = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCANNED_FILE = /\.(service|repository)\.ts$/;
const SLICE_IMPORT = /^import\s+(?!type\b)[^;]*?from '\.\.\/([\w-]+)\/[^']*';/gm;

const SLICE_API_ROOTS: Readonly<Record<string, readonly [ApiRoot, ...ApiRoot[]]>> = {
  audience: ['audience'],
  bars: ['bars'],
  'calendar-feeds': ['me'],
  'free-slots': ['free-slots'],
  improvements: ['improvements'],
  instruments: ['instruments'],
  mastery: ['mastery'],
  me: ['me'],
  members: ['members'],
  notifications: ['notifications'],
  oauth: ['oauth', 'assistant-grants'],
  outreach: ['outreach'],
  sessions: ['sessions', 'offline-manifest'],
  setlists: ['setlists'],
  songs: ['songs'],
  streaks: ['streaks'],
  studies: ['studies'],
  takes: ['takes'],
  tasks: ['tasks'],
  transitions: ['transition-comments'],
};

const SLICES_HOLDING_NO_BAND_DATA = new Set([
  '__test',
  'auth',
  'database',
  'helpers',
  'mcp',
  'notifications',
  'realtime',
  'uploads',
]);

const WRITES_INTO: Readonly<Record<string, readonly string[]>> = {
  instruments: ['setlists', 'songs'],
  members: ['bars', 'calendar-feeds', 'mastery', 'oauth', 'setlists', 'songs', 'studies', 'tasks'],
  sessions: ['setlists', 'takes', 'tasks'],
  songs: ['mastery', 'setlists', 'studies', 'takes', 'tasks'],
};

const CONTACT_ONLY_WRITES: Readonly<Record<string, readonly string[]>> = {
  me: ['members'],
};

const TOOL_ONLY_IMPORTS: Readonly<Record<string, readonly string[]>> = {
  me: ['streaks', 'studies'],
  setlists: ['transitions'],
};

interface SliceImport {
  readonly slice: string;
  readonly imported: string;
}

function listSlices(): readonly string[] {
  return readdirSync(SOURCE_FOLDER, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listSliceImports(slice: string): readonly SliceImport[] {
  const folder = join(SOURCE_FOLDER, slice);
  return readdirSync(folder)
    .filter((file) => SCANNED_FILE.test(file))
    .flatMap((file) =>
      [...readFileSync(join(folder, file), 'utf8').matchAll(SLICE_IMPORT)].map((match) => ({
        slice,
        imported: match[1] ?? '',
      })),
    );
}

function readRoots(slice: string): readonly ApiRoot[] {
  return SLICE_API_ROOTS[slice] ?? [];
}

function readPrimaryRoot(slice: string): ApiRoot | null {
  return SLICE_API_ROOTS[slice]?.[0] ?? null;
}

function isListedRead(slice: string, imported: string): boolean {
  const importedRoot = readPrimaryRoot(imported);
  if (importedRoot === null) return true;
  return readRoots(slice).every(
    (root) => root === importedRoot || (DERIVED_READ_ROOTS[root] ?? []).includes(importedRoot),
  );
}

function isExempt(table: Readonly<Record<string, readonly string[]>>, link: SliceImport): boolean {
  return (table[link.slice] ?? []).includes(link.imported);
}

function listDataImports(): readonly SliceImport[] {
  return listSlices()
    .filter((slice) => !SLICES_HOLDING_NO_BAND_DATA.has(slice))
    .flatMap(listSliceImports)
    .filter((link) => link.imported !== link.slice)
    .filter((link) => !SLICES_HOLDING_NO_BAND_DATA.has(link.imported));
}

// @FollowsBlueprint test-pure-unit
describe('the derived reads the API aggregates from other slices', () => {
  it('maps every slice to the API roots it serves, or says it holds no band data', () => {
    const undecided = listSlices().filter(
      (slice) => SLICE_API_ROOTS[slice] === undefined && !SLICES_HOLDING_NO_BAND_DATA.has(slice),
    );
    expect(undecided).toStrictEqual([]);
  });

  it('reads the cross-slice imports of every service and repository', () => {
    expect(listDataImports()).toEqual(
      expect.arrayContaining([
        { slice: 'studies', imported: 'mastery' },
        { slice: 'studies', imported: 'setlists' },
        { slice: 'streaks', imported: 'sessions' },
      ]),
    );
  });

  it('lists in a slice’s row every slice its services and repositories read', () => {
    const unlisted = listDataImports()
      .filter(
        (link) =>
          !isExempt(WRITES_INTO, link) &&
          !isExempt(CONTACT_ONLY_WRITES, link) &&
          !isExempt(TOOL_ONLY_IMPORTS, link),
      )
      .filter((link) => !isListedRead(link.slice, link.imported))
      .map((link) => `${link.slice} reads ${link.imported}`);
    expect([...new Set(unlisted)]).toStrictEqual([]);
  });

  it('lists the writer in the row of every slice a write cascades into', () => {
    const unheard = Object.entries(WRITES_INTO).flatMap(([writer, targets]) =>
      targets
        .filter((target) => !isListedRead(target, writer))
        .map((target) => `${target} misses ${writer}`),
    );
    expect(unheard).toStrictEqual([]);
  });

  it('keeps no exemption that matches no import', () => {
    const imports = listDataImports();
    const unused = [
      ...Object.entries(WRITES_INTO),
      ...Object.entries(CONTACT_ONLY_WRITES),
      ...Object.entries(TOOL_ONLY_IMPORTS),
    ].flatMap(([slice, importedSlices]) =>
      importedSlices
        .filter(
          (imported) => !imports.some((link) => link.slice === slice && link.imported === imported),
        )
        .map((imported) => `${slice} > ${imported}`),
    );
    expect(unused).toStrictEqual([]);
  });
});
