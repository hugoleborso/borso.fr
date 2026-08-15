#!/usr/bin/env tsx
/**
 * Generates `docs/standards/temporal-coupling.md` from the git history crossed
 * with the module graph the architecture generator already writes.
 *
 * Usage:
 *   pnpm exec tsx scripts/standards/temporal-coupling.ts [--commits <n>]
 *
 * There is no `--check`, for the reason written at length in
 * `docs/dantotsus/a-freshness-gate-on-an-artefact-made-of-git-history.md`: the
 * input is the history, so the page changes on every commit whether or not any
 * source moved, and a freshness gate on it could never be green. The page
 * records the revision it was read at instead.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildReachability,
  partitionByConnection,
  rankCoupledPairs,
  renderCouplingReport,
  type Commit,
  type CouplingOptions,
  type GraphFile,
} from './coupling.core';

const REPOSITORY_ROOT = process.cwd();
const REPORT_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'temporal-coupling.md');
const MODEL_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'architecture');
const SOURCE_PATH_PATTERN = /^(apps|infra)\/.*\.(ts|tsx)$/;
const DEFAULT_COMMIT_WINDOW = 400;
const COMMIT_HEADING_PATTERN = /^[0-9a-f]{40}$/;
const MAXIMUM_GIT_OUTPUT_BYTES = 64 * 1024 * 1024;
const OPTIONS: CouplingOptions = { maximumCommitBreadth: 25, minimumSharedCommits: 4 };

function readCommitWindow(): number {
  const flagIndex = process.argv.indexOf('--commits');
  if (flagIndex === -1) return DEFAULT_COMMIT_WINDOW;
  const parsed = Number.parseInt(process.argv[flagIndex + 1] ?? '', 10);
  return Number.isNaN(parsed) ? DEFAULT_COMMIT_WINDOW : parsed;
}

/**
 * The window's commits, each as the source paths it touched.
 *
 * Merges are excluded: a merge commit lists every file either side changed, so
 * it would couple two unrelated branches' worth of work together.
 */
function readCommits(commitWindow: number): readonly Commit[] {
  const log = execFileSync(
    'git',
    ['log', `-${String(commitWindow)}`, '--name-only', '--format=%H', '--no-merges'],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: MAXIMUM_GIT_OUTPUT_BYTES },
  );
  const commits: string[][] = [];
  let current: string[] = [];
  for (const line of log.split('\n')) {
    if (COMMIT_HEADING_PATTERN.test(line)) {
      commits.push(current);
      current = [];
      continue;
    }
    if (SOURCE_PATH_PATTERN.test(line)) current.push(line);
  }
  commits.push(current);
  return commits.filter((paths) => paths.length > 1);
}

/** Every application's module graph, read from the committed architecture models. */
function readGraphFiles(): readonly GraphFile[] {
  const applications = execFileSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/architecture/architecture-graph.ts', '--list'],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
  )
    .split('\n')
    .filter((name) => name.trim() !== '');

  return applications.flatMap((application) => {
    const path = join(MODEL_DIRECTORY, `${application}-architecture.json`);
    if (!existsSync(path)) return [];
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const files: unknown =
      typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'files') : null;
    if (!Array.isArray(files)) return [];
    return files.flatMap((file: unknown): GraphFile[] => {
      if (typeof file !== 'object' || file === null) return [];
      const filePath: unknown = Reflect.get(file, 'path');
      const imports: unknown = Reflect.get(file, 'imports');
      if (typeof filePath !== 'string' || !Array.isArray(imports)) return [];
      return [{ path: filePath, imports: imports.filter((each) => typeof each === 'string') }];
    });
  });
}

function readHeadRevision(): string {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  }).trim();
}

const commitWindow = readCommitWindow();
const commits = readCommits(commitWindow);
const reachable = buildReachability(readGraphFiles());
const partitioned = partitionByConnection(rankCoupledPairs(commits, OPTIONS), reachable);

writeFileSync(
  REPORT_PATH,
  renderCouplingReport({ ...partitioned, commitWindow, headRevision: readHeadRevision() }),
);
console.log(
  `Wrote docs/standards/temporal-coupling.md: ${String(partitioned.hidden.length)} unconnected, ${String(partitioned.connected.length)} connected and ${String(partitioned.uncovered.length)} unmodelled pair(s) from ${String(commits.length)} commit(s).`,
);
