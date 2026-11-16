#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  isCheckOnlyChange,
  isProductionInertChange,
  isToolingOnlyChange,
  manifestPathOf,
} from './check-only-change.core';

const INFRA_KEY = 'infra';
const INFRA_DIRECTORY = 'infra/cdk';
const APP_PREFIX = 'apps/';
const USAGE = `usage:
  drop-check-only-changes.ts <base-revision> <changes-json> [--tooling|--production]
      prints <changes-json> without the app and infra keys whose only change since
      <base-revision> is a check-only script in their package.json; with --tooling,
      also without those whose every change is a test, an upper-case document or a test config;
      with --production, also without those whose every change is one of those or the
      preview-only test seed under apps/<app>/api/src/__test/`;
const RULE_BY_FLAG = new Map([
  ['--tooling', isToolingOnlyChange],
  ['--production', isProductionInertChange],
]);

function directoryOf(key: string): string | null {
  if (key === INFRA_KEY) return INFRA_DIRECTORY;
  const directory = `${APP_PREFIX}${key}`;
  return existsSync(directory) ? directory : null;
}

function listChangedFiles(base: string, directory: string): string[] {
  const output = execFileSync('git', ['diff', '--name-only', base, 'HEAD', '--', directory], {
    encoding: 'utf8',
  });
  return output.split('\n').filter((line) => line !== '');
}

function readManifestAt(base: string, directory: string): unknown {
  const parsed: unknown = JSON.parse(
    execFileSync('git', ['show', `${base}:${manifestPathOf(directory)}`], { encoding: 'utf8' }),
  );
  return parsed;
}

function readManifestInWorkingTree(directory: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(manifestPathOf(directory), 'utf8'));
  return parsed;
}

function isDroppable(base: string, key: string, flag: string | undefined): boolean {
  const directory = directoryOf(key);
  if (directory === null) return false;
  const rule = (flag === undefined ? undefined : RULE_BY_FLAG.get(flag)) ?? isCheckOnlyChange;
  return rule(directory, listChangedFiles(base, directory), {
    before: readManifestAt(base, directory),
    after: readManifestInWorkingTree(directory),
  });
}

const [base, changesJson, flag] = process.argv.slice(2);

if (
  base === undefined ||
  changesJson === undefined ||
  (flag !== undefined && !RULE_BY_FLAG.has(flag))
) {
  console.error(USAGE);
  process.exit(2);
}

const changes: unknown = JSON.parse(changesJson);
if (!Array.isArray(changes)) {
  console.error(USAGE);
  process.exit(2);
}

const kept = changes.filter((key) => typeof key !== 'string' || !isDroppable(base, key, flag));
console.log(JSON.stringify(kept));
