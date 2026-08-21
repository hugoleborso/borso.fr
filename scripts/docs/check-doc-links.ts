#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, normalize } from 'node:path';
import { listBrokenLinks, type BrokenLink } from './doc-links.core';

const REPOSITORY_ROOT = process.cwd();
const LIST_FILES_BUFFER_BYTES = 16 * 1024 * 1024;
const HISTORICAL_PREFIX = 'docs/features/';

const TEMPLATE_SUFFIX = '/template.md';

function listDocuments(): readonly string[] {
  return execFileSync('git', ['ls-files', '*.md'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((path) => path.length > 0)
    .filter((path) => !path.startsWith(HISTORICAL_PREFIX))
    .filter((path) => !path.endsWith(TEMPLATE_SUFFIX));
}

function listIgnoredFilesOnDisk(): readonly string[] {
  return execFileSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    maxBuffer: LIST_FILES_BUFFER_BYTES,
  })
    .split('\n')
    .filter((path) => path.length > 0);
}

function buildTrackedPaths(): ReadonlySet<string> {
  const tracked = new Set<string>();
  const files = execFileSync('git', ['ls-files'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    maxBuffer: LIST_FILES_BUFFER_BYTES,
  })
    .split('\n')
    .concat(listIgnoredFilesOnDisk());
  for (const file of files) {
    if (file.length === 0) continue;
    tracked.add(file);
    let directory = dirname(file);
    while (directory !== '.') {
      tracked.add(directory);
      directory = dirname(directory);
    }
  }
  return tracked;
}

const trackedPaths = buildTrackedPaths();

const TRAILING_SEPARATOR = /\/+$/;

function withoutTrailingSeparator(path: string): string {
  return path.replace(TRAILING_SEPARATOR, '');
}

function isPresent(documentPath: string, target: string): boolean {
  return trackedPaths.has(withoutTrailingSeparator(normalize(join(dirname(documentPath), target))));
}

const broken: BrokenLink[] = [];
for (const path of listDocuments()) {
  const markdown = readFileSync(join(REPOSITORY_ROOT, path), 'utf8');
  broken.push(...listBrokenLinks({ path, markdown }, isPresent));
}

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
console.log('[check-doc-links] every document link names a file that exists');
