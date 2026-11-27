import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

import { listAppsWhoseOutputChanged } from '../deploy/synthesized-output';
import {
  decideDeployCandidates,
  describeDeployFanout,
  keepChangedOutput,
} from './deploy-fanout.core';

const DEFAULT_BASE = 'origin/main';
const DEFAULT_HEAD = 'HEAD';
const CANDIDATES_ONLY_FLAG = '--candidates-only';
const UNREADABLE_EXIT_CODE = 1;

function git(argumentsForGit: readonly string[]): string {
  return execFileSync('git', argumentsForGit, { encoding: 'utf8' }).trim();
}

const operands = process.argv.slice(2).filter((argument) => argument !== CANDIDATES_ONLY_FLAG);
const isCandidatesOnly = process.argv.includes(CANDIDATES_ONLY_FLAG);
const base = operands[0] ?? DEFAULT_BASE;
const head = operands[1] ?? DEFAULT_HEAD;

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

const candidates = decideDeployCandidates(changedPaths, applicationSlugs);

if (isCandidatesOnly || candidates.applications.length === 0) {
  process.stdout.write(`${describeDeployFanout(candidates)}\n`);
} else {
  const mergeBase = git(['merge-base', base, head]);
  const isThisCheckout = git(['rev-parse', head]) === git(['rev-parse', DEFAULT_HEAD]);
  const changed = listAppsWhoseOutputChanged(
    mergeBase,
    isThisCheckout ? null : head,
    candidates.applications,
  );
  process.stdout.write(`${describeDeployFanout(keepChangedOutput(candidates, changed))}\n`);
}
