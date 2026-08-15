#!/usr/bin/env tsx
/**
 * Generates `docs/standards/hotspots.md` from the git history crossed with the
 * repository's own signals about each file.
 *
 * Usage:
 *   pnpm exec tsx scripts/standards/hotspots.ts [--commits <n>]
 *   pnpm exec tsx scripts/standards/hotspots.ts --check
 *
 * `--check` only verifies the page is not stale. There is no ratchet and no
 * threshold, because the input is history: the same source that was fine
 * yesterday scores higher today for no reason anyone controls, and a gate on
 * that would fail commits for the wrong reason.
 *
 * The window is a commit count rather than a date so the report is reproducible
 * from a checkout without a clock. `--check` uses the same default the writer
 * does, or the page would go stale on every commit.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inferLayer, isTestFile } from '../../.claude/skills/blueprint/blueprint-utils.js';
import { renderHotspotReport, type FileHistory } from './hotspots.core';

const REPOSITORY_ROOT = process.cwd();
const REPORT_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'hotspots.md');
const SOURCE_PATH_PATTERN = /^(apps|infra)\/.*\.(ts|tsx)$/;
const DEFAULT_COMMIT_WINDOW = 400;
const PATTERN_MARKER_PATTERN = /@Blueprint\s|@FollowsBlueprint\s/;

function readCommitWindow(): number {
  const flagIndex = process.argv.indexOf('--commits');
  if (flagIndex === -1) return DEFAULT_COMMIT_WINDOW;
  const parsedWindow = Number.parseInt(process.argv[flagIndex + 1] ?? '', 10);
  return Number.isNaN(parsedWindow) ? DEFAULT_COMMIT_WINDOW : parsedWindow;
}

function listTrackedSourceFiles(): readonly string[] {
  return execFileSync('git', ['ls-files'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((path) => SOURCE_PATH_PATTERN.test(path))
    .filter((path) => !isTestFile(path))
    .filter((path) => !path.endsWith('.d.ts'));
}

/**
 * Commits touching each path in the window.
 *
 * `--follow` is deliberately not used. It only accepts one path, and this
 * repository renames in bulk, so a per-file follow would cost one git process
 * per file. A file that moved reads as new here, which understates its churn
 * and is the safe direction to be wrong in: it hides a hotspot rather than
 * inventing one.
 */
function countCommitsByPath(commitWindow: number): ReadonlyMap<string, number> {
  const log = execFileSync(
    'git',
    ['log', `-${String(commitWindow)}`, '--name-only', '--format=%H', '--no-merges'],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const counts = new Map<string, number>();
  for (const line of log.split('\n')) {
    const path = line.trim();
    if (path.length === 0) continue;
    if (!SOURCE_PATH_PATTERN.test(path)) continue;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  return counts;
}

function countCommitsRead(commitWindow: number): number {
  const revisions = execFileSync(
    'git',
    ['log', `-${String(commitWindow)}`, '--format=%H', '--no-merges'],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  return revisions.split('\n').filter((line) => line.trim().length > 0).length;
}

function readHistories(commitWindow: number): readonly FileHistory[] {
  const commitCounts = countCommitsByPath(commitWindow);
  return listTrackedSourceFiles().map((path) => ({
    path,
    commits: commitCounts.get(path) ?? 0,
    layer: inferLayer(path),
    followsAPattern: PATTERN_MARKER_PATTERN.test(readFileSync(join(REPOSITORY_ROOT, path), 'utf8')),
  }));
}

function main(): void {
  const commitWindow = readCommitWindow();
  const rendered = renderHotspotReport(readHistories(commitWindow), countCommitsRead(commitWindow));

  if (process.argv.includes('--check')) {
    const onDisk = existsSync(REPORT_PATH) ? readFileSync(REPORT_PATH, 'utf8') : '';
    if (onDisk !== rendered) {
      console.error(
        '  docs/standards/hotspots.md is out of date. Run `pnpm exec tsx scripts/standards/hotspots.ts`.',
      );
      process.exitCode = 1;
      return;
    }
    console.log('hotspots.md is up to date.');
    return;
  }

  writeFileSync(REPORT_PATH, rendered);
  console.log(`Wrote docs/standards/hotspots.md from the last ${String(commitWindow)} commit(s).`);
}

main();
