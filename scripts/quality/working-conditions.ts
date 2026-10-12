#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { REPOSITORY_ROOT, runGit } from './dantotsu-corpus';
import { renderWorkingConditionsPage } from './working-conditions-page.core';
import {
  fileFriction,
  readInventoryLines,
  readKaizenLines,
  readWalls,
  selectWallProblems,
  type FrictionLine,
} from './working-conditions.core';

const QUALITY_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'quality');
const WALLS_PATH = join(QUALITY_DIRECTORY, 'working-conditions.md');
const OUTPUT_PATH = join(QUALITY_DIRECTORY, 'working-conditions.html');
const FEATURES_PREFIX = 'docs/features';
const KAIZEN_FILE_PATTERN = /^docs\/features\/.+\/kaizen[^/]*\.md$/;
const INVENTORY_FILE_PATTERN = /^docs\/features\/.+\/inventory[^/]*\.md$/;
const ISO_DATE_LENGTH = 10;

function readFrictionLines(files: readonly string[]): readonly FrictionLine[] {
  return files.flatMap((file) => {
    const task = relative(FEATURES_PREFIX, dirname(file));
    const markdown = readFileSync(join(REPOSITORY_ROOT, file), 'utf8');
    return basename(file).startsWith('kaizen')
      ? readKaizenLines(task, markdown)
      : readInventoryLines(task, markdown);
  });
}

function main(): void {
  const now = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
  const files = runGit(['ls-files', FEATURES_PREFIX])
    .split('\n')
    .filter((file) => KAIZEN_FILE_PATTERN.test(file) || INVENTORY_FILE_PATTERN.test(file));
  const walls = readWalls(readFileSync(WALLS_PATH, 'utf8'));
  const board = fileFriction(readFrictionLines(files), walls);
  mkdirSync(QUALITY_DIRECTORY, { recursive: true });
  writeFileSync(OUTPUT_PATH, renderWorkingConditionsPage(board, now, files.length), 'utf8');
  const problems = selectWallProblems(walls, board);
  for (const problem of problems) process.stderr.write(`  ${problem}\n`);
  if (problems.length > 0) {
    process.stderr.write('\nThe walls are declared in docs/quality/working-conditions.md.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Wrote docs/quality/working-conditions.html (${String(board.walls.length)} walls, ${String(board.unfiled.length)} unfiled line(s)).\n`,
  );
}

main();
