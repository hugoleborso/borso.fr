#!/usr/bin/env tsx

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
import {
  COMMIT_HEADING_PATTERN,
  REPOSITORY_ROOT,
  SOURCE_PATH_PATTERN,
  readCommitLog,
  readCommitWindow,
  readHeadRevision,
} from './git-history.adapter';

const REPORT_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'temporal-coupling.md');
const MODEL_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'architecture');
const OPTIONS: CouplingOptions = { maximumCommitBreadth: 25, minimumSharedCommits: 4 };

function readCommits(commitWindow: number): readonly Commit[] {
  const log = readCommitLog(commitWindow);
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

const commitWindow = readCommitWindow();
const commits = readCommits(commitWindow);
const graphFiles = readGraphFiles();
const reachable = buildReachability(graphFiles);
const partitioned = partitionByConnection(rankCoupledPairs(commits, OPTIONS), reachable);

writeFileSync(
  REPORT_PATH,
  renderCouplingReport({
    ...partitioned,
    commitWindow,
    headRevision: readHeadRevision(),
    isGraphRead: graphFiles.length > 0,
  }),
);
console.log(
  `Wrote docs/standards/temporal-coupling.md: ${String(partitioned.hidden.length)} unconnected, ${String(partitioned.connected.length)} connected and ${String(partitioned.uncovered.length)} unmodelled pair(s) from ${String(commits.length)} commit(s).`,
);
