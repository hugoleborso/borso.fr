#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  digestDependencies,
  listChangedImporters,
  parseLockfile,
  pickRootManifestFields,
  stripCatalogs,
  type DependencyInputs,
} from './dependency-closure.core';

const LOCKFILE = 'pnpm-lock.yaml';
const WORKSPACE_FILE = 'pnpm-workspace.yaml';
const ROOT_MANIFEST = 'package.json';
const APP_PREFIX = 'apps/';
const USAGE = `usage:
  apps-with-changed-dependencies.ts changed <base-revision> <app>...
      prints, as a JSON array, the apps whose resolved dependencies differ from <base-revision>
  apps-with-changed-dependencies.ts digest <app>
      prints a digest of what <app> resolves in the working tree`;

function readFromWorkingTree(path: string): string {
  return readFileSync(path, 'utf8');
}

function readFromRevision(revision: string): (path: string) => string {
  return (path) => execFileSync('git', ['show', `${revision}:${path}`], { encoding: 'utf8' });
}

function readInputs(read: (path: string) => string): DependencyInputs {
  const manifest: unknown = JSON.parse(read(ROOT_MANIFEST));
  return {
    lockfile: parseLockfile(read(LOCKFILE)),
    workspaceSettings: stripCatalogs(read(WORKSPACE_FILE)),
    rootManifestFields: pickRootManifestFields(manifest),
  };
}

const [command, ...operands] = process.argv.slice(2);

if (command === 'digest' && operands.length === 1) {
  console.log(
    digestDependencies(readInputs(readFromWorkingTree), `${APP_PREFIX}${operands[0] ?? ''}`),
  );
} else if (command === 'changed' && operands.length > 0) {
  const [base = '', ...apps] = operands;
  const changed = listChangedImporters(
    readInputs(readFromRevision(base)),
    readInputs(readFromWorkingTree),
    apps.map((app) => `${APP_PREFIX}${app}`),
  );
  console.log(JSON.stringify(changed.map((path) => path.slice(APP_PREFIX.length))));
} else {
  console.error(USAGE);
  process.exit(2);
}
