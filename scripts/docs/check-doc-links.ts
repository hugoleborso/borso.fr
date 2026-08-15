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

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, normalize } from 'node:path';
import { listBrokenLinks, type BrokenLink } from './doc-links.core';

const REPOSITORY_ROOT = process.cwd();
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

function isPresent(documentPath: string, target: string): boolean {
  return existsSync(join(REPOSITORY_ROOT, normalize(join(dirname(documentPath), target))));
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
