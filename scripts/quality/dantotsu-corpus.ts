import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readDantotsuDocument, type DantotsuDocument } from './dantotsu-record.core';

export const REPOSITORY_ROOT = process.cwd();
export const DANTOTSUS_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'dantotsus');
const NON_DANTOTSU_FILES: ReadonlySet<string> = new Set(['README.md', '_template.md']);
const MARKDOWN_SUFFIX = /\.md$/;

export function readDantotsuCorpus(): readonly DantotsuDocument[] {
  return readdirSync(DANTOTSUS_DIRECTORY)
    .filter((name) => name.endsWith('.md') && !NON_DANTOTSU_FILES.has(name))
    .sort()
    .map((name) =>
      readDantotsuDocument(
        name.replace(MARKDOWN_SUFFIX, ''),
        readFileSync(join(DANTOTSUS_DIRECTORY, name), 'utf8'),
      ),
    );
}

export function runGit(argumentsList: readonly string[]): string {
  return execFileSync('git', argumentsList, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function readTrackedPaths(): ReadonlySet<string> {
  const paths = new Set<string>();
  for (const file of runGit(['ls-files']).split('\n')) {
    if (file.length === 0) continue;
    paths.add(file);
    for (let folder = dirname(file); folder !== '.'; folder = dirname(folder)) paths.add(folder);
  }
  return paths;
}
