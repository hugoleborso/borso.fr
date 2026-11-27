#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inferLayer } from '../../.claude/skills/blueprint/blueprint-utils.js';
import {
  COMMIT_HEADING_PATTERN,
  REPOSITORY_ROOT,
  SOURCE_PATH_PATTERN,
  listTrackedSourceFiles,
  readCommitLog,
  readCommitWindow,
  readHeadRevision,
} from './git-history.adapter';
import { renderHotspotReport, type FileHistory } from './hotspots.core';

const REPORT_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'hotspots.md');
const PATTERN_MARKER_PATTERN = /@Blueprint\s|@FollowsBlueprint\s/;

function countCommitsByPath(log: string): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const line of log.split('\n')) {
    const path = line.trim();
    if (path.length === 0) continue;
    if (!SOURCE_PATH_PATTERN.test(path)) continue;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  return counts;
}

function readHistories(log: string): readonly FileHistory[] {
  const commitCounts = countCommitsByPath(log);
  return listTrackedSourceFiles().map((path) => ({
    path,
    commits: commitCounts.get(path) ?? 0,
    layer: inferLayer(path),
    followsAPattern: PATTERN_MARKER_PATTERN.test(readFileSync(join(REPOSITORY_ROOT, path), 'utf8')),
  }));
}

function main(): void {
  const commitWindow = readCommitWindow();
  const log = readCommitLog(commitWindow);
  const commitsRead = log.split('\n').filter((line) => COMMIT_HEADING_PATTERN.test(line)).length;
  const rendered = renderHotspotReport(readHistories(log), commitsRead, readHeadRevision());

  writeFileSync(REPORT_PATH, rendered);
  console.log(`Wrote docs/standards/hotspots.md from the last ${String(commitWindow)} commit(s).`);
}

main();
