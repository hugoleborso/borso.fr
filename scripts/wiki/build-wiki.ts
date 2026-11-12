#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWiki, GENERATED_REPORTS, isWikiSource, type SourceDocument } from './wiki-pages.core';

const DEFAULT_REPOSITORY = 'hugoleborso/borso.fr';
const USAGE = 'Usage: scripts/wiki/build-wiki.ts <output directory>';

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const outputDirectory = process.argv[2];
if (outputDirectory === undefined) {
  console.error(USAGE);
  process.exit(1);
}

const tracked = git('ls-files', '-z', '*.md').split('\0').filter(isWikiSource);
const generated = GENERATED_REPORTS.map(([path]) => path).filter((path) => existsSync(path));
const documents: SourceDocument[] = [...new Set([...tracked, ...generated])].map((path) => ({
  path,
  content: readFileSync(path, 'utf8'),
}));

const pages = buildWiki(documents, {
  repository: process.env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY,
  commit: git('rev-parse', 'HEAD'),
});

mkdirSync(outputDirectory, { recursive: true });
for (const page of pages) {
  writeFileSync(join(outputDirectory, `${page.name}.md`), page.content);
}
console.log(`Wrote ${pages.length} wiki pages to ${outputDirectory}`);
