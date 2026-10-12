#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isCheckOnlyChange, manifestPathOf } from './check-only-change.core';

const INFRA_KEY = 'infra';
const INFRA_DIRECTORY = 'infra/cdk';
const APP_PREFIX = 'apps/';
const USAGE = `usage:
  drop-check-only-changes.ts <base-revision> <changes-json>
      prints <changes-json> without the app and infra keys whose only change since
      <base-revision> is a check-only script in their package.json`;

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

function isDroppable(base: string, key: string): boolean {
  const directory = directoryOf(key);
  if (directory === null) return false;
  return isCheckOnlyChange(directory, listChangedFiles(base, directory), {
    before: readManifestAt(base, directory),
    after: readManifestInWorkingTree(directory),
  });
}

const [base, changesJson] = process.argv.slice(2);

if (base === undefined || changesJson === undefined) {
  console.error(USAGE);
  process.exit(2);
}

const changes: unknown = JSON.parse(changesJson);
if (!Array.isArray(changes)) {
  console.error(USAGE);
  process.exit(2);
}

const kept = changes.filter((key) => typeof key !== 'string' || !isDroppable(base, key));
console.log(JSON.stringify(kept));
