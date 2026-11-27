import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isTestFile } from '../test-file.core.js';

export const REPOSITORY_ROOT = process.cwd();
export const SOURCE_PATH_PATTERN = /^(apps|infra)\/.*\.(ts|tsx)$/;
export const COMMIT_HEADING_PATTERN = /^[0-9a-f]{40}$/;
const DEFAULT_COMMIT_WINDOW = 400;
const MAXIMUM_GIT_OUTPUT_BYTES = 64 * 1024 * 1024;

function runGit(argumentsList: readonly string[]): string {
  return execFileSync('git', argumentsList, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    maxBuffer: MAXIMUM_GIT_OUTPUT_BYTES,
  });
}

export function readCommitWindow(): number {
  const flagIndex = process.argv.indexOf('--commits');
  if (flagIndex === -1) return DEFAULT_COMMIT_WINDOW;
  const parsedWindow = Number.parseInt(process.argv[flagIndex + 1] ?? '', 10);
  return Number.isNaN(parsedWindow) ? DEFAULT_COMMIT_WINDOW : parsedWindow;
}

export function listTrackedSourceFiles(): readonly string[] {
  return runGit(['ls-files'])
    .split('\n')
    .filter((path) => SOURCE_PATH_PATTERN.test(path))
    .filter((path) => !isTestFile(path))
    .filter((path) => !path.endsWith('.d.ts'))
    .filter((path) => existsSync(join(REPOSITORY_ROOT, path)));
}

export function readCommitLog(commitWindow: number): string {
  return runGit(['log', `-${String(commitWindow)}`, '--name-only', '--format=%H', '--no-merges']);
}

export function readHeadRevision(): string {
  return runGit(['rev-parse', '--short', 'HEAD']).trim();
}
