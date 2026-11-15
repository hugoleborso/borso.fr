import type { Issue, IssueRecords, ReporterOptions } from 'knip';
import { describe, expect, it } from 'vitest';
import { withoutUntrackedFiles } from './untracked-files.core';

const TRACKED = 'scripts/tracked.ts';
const UNTRACKED = 'scripts/probe.ts';

function issueAt(path: string, symbol: string): Issue {
  return {
    type: 'exports',
    filePath: `/repo/${path}`,
    symbol,
    workspace: '.',
    severity: 'error',
    fixes: [],
  };
}

function recordsOf(...entries: readonly (readonly [string, ...string[]])[]): IssueRecords {
  return Object.fromEntries(
    entries.map(([path, ...symbols]) => [
      path,
      Object.fromEntries(symbols.map((symbol) => [symbol, issueAt(path, symbol)])),
    ]),
  );
}

function reportWith(files: IssueRecords, exports: IssueRecords): ReporterOptions {
  const empty: IssueRecords = {};
  return {
    report: {
      files: true,
      dependencies: true,
      devDependencies: true,
      optionalPeerDependencies: true,
      unlisted: true,
      binaries: true,
      unresolved: true,
      exports: true,
      types: true,
      nsExports: true,
      nsTypes: true,
      duplicates: true,
      enumMembers: true,
      namespaceMembers: true,
      catalog: true,
      catalogReferences: true,
      cycles: true,
    },
    issues: {
      files,
      exports,
      dependencies: empty,
      devDependencies: empty,
      optionalPeerDependencies: empty,
      unlisted: empty,
      binaries: empty,
      unresolved: empty,
      types: empty,
      nsExports: empty,
      nsTypes: empty,
      duplicates: empty,
      enumMembers: empty,
      namespaceMembers: empty,
      catalog: empty,
      catalogReferences: empty,
      cycles: empty,
    },
    counters: {
      files: Object.keys(files).length,
      exports: 3,
      dependencies: 0,
      devDependencies: 0,
      optionalPeerDependencies: 0,
      unlisted: 0,
      binaries: 0,
      unresolved: 0,
      types: 0,
      nsExports: 0,
      nsTypes: 0,
      duplicates: 0,
      enumMembers: 0,
      namespaceMembers: 0,
      catalog: 0,
      catalogReferences: 0,
      cycles: 0,
      processed: 40,
      total: 40,
    },
    tagHints: new Set(),
    configurationHints: [],
    hasConfigLoadErrors: false,
    enabledPlugins: {},
    isDisableConfigHints: false,
    isDisableTagHints: false,
    isTreatConfigHintsAsErrors: false,
    isTreatTagHintsAsErrors: false,
    cwd: '/repo',
    isProduction: false,
    isShowProgress: false,
    options: '',
    preprocessorOptions: '',
    includedWorkspaceDirs: [],
    selectedWorkspaces: undefined,
    configFilePath: undefined,
  };
}

describe('withoutUntrackedFiles', () => {
  const report = reportWith(
    recordsOf([UNTRACKED, UNTRACKED]),
    recordsOf([TRACKED, 'used'], [UNTRACKED, 'first', 'second']),
  );

  it('drops every issue keyed by an untracked path and counts them out', () => {
    const kept = withoutUntrackedFiles(report, new Set([UNTRACKED]));

    expect(kept.issues.files).toStrictEqual({});
    expect(kept.issues.exports).toStrictEqual(recordsOf([TRACKED, 'used']));
    expect(kept.counters.files).toBe(0);
    expect(kept.counters.exports).toBe(1);
  });

  it('keeps the processed and total file counts, which count files read, not issues', () => {
    const kept = withoutUntrackedFiles(report, new Set([UNTRACKED]));

    expect(kept.counters.processed).toBe(40);
    expect(kept.counters.total).toBe(40);
  });

  it('returns the report unchanged when nothing is untracked', () => {
    expect(withoutUntrackedFiles(report, new Set())).toStrictEqual(report);
  });
});
