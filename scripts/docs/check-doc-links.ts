#!/usr/bin/env tsx
/**
 * Fails when a document links a file that is not there.
 *
 * Usage:
 *   pnpm exec tsx scripts/docs/check-doc-links.ts
 *
 * The enforcement ledger asks whether every standard names a mechanism that
 * runs. This asks the smaller question underneath it: whether the documents
 * doing the naming still point at the files they name. Nothing read them, and
 * the routing table in `/code-standards` — a skill whose entire job is sending
 * a reader to the right standard — had thirteen dead links, one `../` short of
 * the repository root, which is invisible in a rendered preview and fatal to a
 * reader following the path.
 *
 * `docs/features/` is out of scope. Those are records of a conversation at a
 * revision, and a report from May that names a file since renamed is telling
 * the truth about May.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, normalize } from 'node:path';
import { listBrokenLinks, type BrokenLink } from './doc-links.core';

const REPOSITORY_ROOT = process.cwd();
/** `git ls-files` over this repository prints well under a megabyte. */
const LIST_FILES_BUFFER_BYTES = 16 * 1024 * 1024;
const HISTORICAL_PREFIX = 'docs/features/';

/**
 * A template is the skeleton of a file that lands somewhere else, so its links
 * are written to resolve from the artefact's directory and are meant to be
 * broken where they sit. The same text inside a fenced block is already skipped
 * for the same reason; these templates are the artefact top to bottom, so the
 * fence never appears.
 */
const TEMPLATE_SUFFIX = '/template.md';

function listDocuments(): readonly string[] {
  return execFileSync('git', ['ls-files', '*.md'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((path) => path.length > 0)
    .filter((path) => !path.startsWith(HISTORICAL_PREFIX))
    .filter((path) => !path.endsWith(TEMPLATE_SUFFIX));
}

/**
 * Every path a reader can reach, plus every directory on the way to one.
 *
 * Two kinds of path qualify. Tracked ones, from the index rather than the
 * disk, because a link is a claim about the repository and a working tree also
 * holds whatever anyone left lying in it. And ignored ones that are on disk,
 * which is what a generated file looks like: none of them is committed, and
 * every reader — the SessionStart hook, CI's first step, `pages.yml` — runs
 * the generators before anything opens a link.
 *
 * The second kind used to be refused, and the reason was sound at the time:
 * `docs/architecture/README.md` linked five ignored pages that resolved on a
 * machine which had run the generator and failed in CI, where nothing had. CI
 * now runs them immediately after `pnpm install`, so the two answers agree
 * again. An ignored path that is *absent* is still a dead link, which is the
 * case that would catch a generator that stopped producing one.
 */
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

function isPresent(documentPath: string, target: string): boolean {
  // `normalize` keeps a trailing slash, and a directory is tracked under its
  // bare name, so `../knowledge/` and `../knowledge` have to ask the same
  // question.
  return trackedPaths.has(
    normalize(join(dirname(documentPath), target)).replace(TRAILING_SEPARATOR, ''),
  );
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
