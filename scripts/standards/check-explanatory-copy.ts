#!/usr/bin/env tsx

import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  listCopyProblems,
  listExplanatoryKeys,
  type CopyExceptions,
} from './explanatory-copy.core';

const REPOSITORY_ROOT = process.cwd();
const MESSAGES_GLOB = 'apps/*/site/src/i18n/en.json';
const EXCEPTIONS_PATH = 'docs/standards/explanatory-copy-exceptions.json';
const APP_SEGMENT = 1;

function readJson(relativePath: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8'));
  return parsed;
}

function readExceptions(): CopyExceptions {
  const parsed = readJson(EXCEPTIONS_PATH);
  const exceptions: Record<string, string> = {};
  if (typeof parsed !== 'object' || parsed === null) return exceptions;
  for (const [key, reason] of Object.entries(parsed)) {
    exceptions[key] = typeof reason === 'string' ? reason : '';
  }
  return exceptions;
}

const found = globSync(MESSAGES_GLOB, { cwd: REPOSITORY_ROOT })
  .sort()
  .flatMap((path) => listExplanatoryKeys(path.split('/')[APP_SEGMENT] ?? path, readJson(path)));

const problems = listCopyProblems(found, readExceptions());
if (problems.length > 0) {
  for (const problem of problems) console.error(`  ${problem.key} ${problem.message}`);
  console.error(
    `\n${String(problems.length)} problem(s). See "The interface does not explain itself" in docs/standards/05-frontend-architecture.md; an exception lives in ${EXCEPTIONS_PATH} with its reason.`,
  );
  process.exit(1);
}
console.log(
  `[check-explanatory-copy] ${String(found.length)} explanatory message(s), each excepted with a reason`,
);
