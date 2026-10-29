#!/usr/bin/env tsx

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, normalize } from 'node:path';
import { listBrokenLinks, type BrokenLink } from './doc-links.core';

const REPOSITORY_ROOT = process.cwd();
const LIST_FILES_BUFFER_BYTES = 16 * 1024 * 1024;
const DATED_RECORD_SEGMENT = /\/(validation|runs)\//;
const STAGED_FLAG = '--staged';
const MARKDOWN_SUFFIX = '.md';

const TEMPLATE_SUFFIX = '/template.md';

const isStaged = process.argv.includes(STAGED_FLAG);

function runGit(argumentsList: readonly string[], input?: string): string {
  try {
    return execFileSync('git', argumentsList, {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      maxBuffer: LIST_FILES_BUFFER_BYTES,
      input,
    });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'stdout' in error) {
      const { stdout } = error;
      if (typeof stdout === 'string') return stdout;
    }
    throw error;
  }
}

function splitLines(output: string): readonly string[] {
  return output.split('\n').filter((line) => line.length > 0);
}

function isDatedRecord(path: string): boolean {
  return DATED_RECORD_SEGMENT.test(path);
}

function isSymbolicLink(path: string): boolean {
  return lstatSync(join(REPOSITORY_ROOT, path)).isSymbolicLink();
}

function isCheckedDocument(path: string): boolean {
  return (
    path.endsWith(MARKDOWN_SUFFIX) &&
    existsSync(join(REPOSITORY_ROOT, path)) &&
    !isDatedRecord(path) &&
    !isSymbolicLink(path) &&
    !path.endsWith(TEMPLATE_SUFFIX)
  );
}

function addWithParents(paths: Set<string>, file: string): void {
  paths.add(file);
  let directory = dirname(file);
  while (directory !== '.') {
    paths.add(directory);
    directory = dirname(directory);
  }
}

function buildPresentPaths(files: readonly string[]): ReadonlySet<string> {
  const present = new Set<string>();
  for (const file of files) addWithParents(present, file);
  return present;
}

function listRemovedPaths(present: ReadonlySet<string>): readonly string[] {
  const removed = new Set<string>();
  for (const file of splitLines(
    runGit(['diff', '--cached', '--name-only', '--no-renames', '--diff-filter=D']),
  )) {
    removed.add(file);
    let directory = dirname(file);
    while (directory !== '.' && !present.has(directory)) {
      removed.add(directory);
      directory = dirname(directory);
    }
  }
  return [...removed];
}

function listDocumentsNaming(removed: readonly string[]): readonly string[] {
  if (removed.length === 0) return [];
  const patterns = [...new Set(removed.map((path) => basename(path)))].flatMap((name) => [
    '-e',
    name,
  ]);
  return splitLines(runGit(['grep', '-l', '-F', ...patterns, '--', `*${MARKDOWN_SUFFIX}`]));
}

function listStagedDocuments(present: ReadonlySet<string>): readonly string[] {
  const staged = splitLines(
    runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', `*${MARKDOWN_SUFFIX}`]),
  );
  const naming = listDocumentsNaming(listRemovedPaths(present));
  return [...new Set([...staged, ...naming])].filter(isCheckedDocument).sort();
}

function listAllDocuments(): readonly string[] {
  return splitLines(runGit(['ls-files', `*${MARKDOWN_SUFFIX}`])).filter(isCheckedDocument);
}

const TRAILING_SEPARATOR = /\/+$/;

function withoutTrailingSeparator(path: string): string {
  return path.replace(TRAILING_SEPARATOR, '');
}

function resolveTarget(documentPath: string, target: string): string {
  return withoutTrailingSeparator(normalize(join(dirname(documentPath), target)));
}

function selectJudgeable(broken: readonly BrokenLink[]): readonly BrokenLink[] {
  if (broken.length === 0) return broken;
  const ignored = new Set(
    splitLines(
      runGit(
        ['check-ignore', '--no-index', '--stdin'],
        broken.map((link) => resolveTarget(link.document, link.target)).join('\n'),
      ),
    ),
  );
  return broken.filter((link) => !ignored.has(resolveTarget(link.document, link.target)));
}

const trackedFiles = splitLines(runGit(['ls-files']));
const presentPaths = buildPresentPaths(trackedFiles);

function isPresent(documentPath: string, target: string): boolean {
  const resolved = resolveTarget(documentPath, target);
  if (presentPaths.has(resolved)) return true;
  return isStaged && existsSync(join(REPOSITORY_ROOT, resolved));
}

const documents = isStaged ? listStagedDocuments(presentPaths) : listAllDocuments();
const found: BrokenLink[] = [];
for (const path of documents) {
  const markdown = readFileSync(join(REPOSITORY_ROOT, path), 'utf8');
  found.push(...listBrokenLinks({ path, markdown }, isPresent));
}
const broken = selectJudgeable(found);

if (broken.length > 0) {
  for (const link of broken) {
    console.error(
      `  ${link.document}:${String(link.line)} links \`${link.target}\`, which is not there.`,
    );
  }
  console.error(
    `\n${String(broken.length)} dead link(s). Fix the path, or drop the link if the target is gone.`,
  );
  process.exit(1);
}
console.log(
  isStaged
    ? `[check-doc-links] every link in the ${String(documents.length)} document(s) this commit touches names a file that exists`
    : '[check-doc-links] every document link names a file that exists',
);
