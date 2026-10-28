import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

import { decideDeployFanout, describeDeployFanout } from './deploy-fanout.core';

const DEFAULT_BASE = 'origin/main';
const DEFAULT_HEAD = 'HEAD';
const UNREADABLE_EXIT_CODE = 1;

function git(argumentsForGit: readonly string[]): string {
  return execFileSync('git', argumentsForGit, { encoding: 'utf8' }).trim();
}

const base = process.argv[2] ?? DEFAULT_BASE;
const head = process.argv[3] ?? DEFAULT_HEAD;

let changedPaths: string[];
try {
  changedPaths = git(['diff', '--name-only', `${base}...${head}`])
    .split('\n')
    .filter(Boolean);
} catch {
  process.stderr.write(
    `[deploy-fanout] cannot diff ${base}...${head} from this checkout; read the pull request's Files changed tab.\n`,
  );
  process.exit(UNREADABLE_EXIT_CODE);
}

const applicationSlugs = readdirSync('apps', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

process.stdout.write(
  `${describeDeployFanout(decideDeployFanout(changedPaths, applicationSlugs))}\n`,
);
