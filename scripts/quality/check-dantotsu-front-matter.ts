#!/usr/bin/env tsx

import { readTrackedPaths, readDantotsuCorpus, runGit } from './dantotsu-corpus';
import { selectSchemaProblems } from './dantotsu-schema.core';

const MAIN_REFERENCE = 'origin/main';
const STAGED_DANTOTSU_PATTERN = /^docs\/dantotsus\/(.+)\.md$/;

function readMainCommits(): readonly string[] {
  try {
    return runGit(['rev-list', MAIN_REFERENCE])
      .split('\n')
      .filter((line) => line.length > 0);
  } catch {
    process.stderr.write(
      `[check-dantotsu-front-matter] ${MAIN_REFERENCE} is not available here; run \`git fetch origin main\` first.\n`,
    );
    process.exit(1);
  }
}

function readStagedSlugs(): ReadonlySet<string> {
  const slugs = new Set<string>();
  for (const path of runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split(
    '\n',
  )) {
    const slug = STAGED_DANTOTSU_PATTERN.exec(path)?.[1];
    if (slug !== undefined) slugs.add(slug);
  }
  return slugs;
}

function main(): void {
  const corpus = readDantotsuCorpus();
  const problems = selectSchemaProblems(corpus, {
    mainCommits: readMainCommits(),
    trackedPaths: readTrackedPaths(),
    verifiedSlugs: process.argv.includes('--staged') ? readStagedSlugs() : null,
  });
  if (problems.length === 0) {
    process.stdout.write(
      `[check-dantotsu-front-matter] ${String(corpus.length)} dantotsus carry a complete, resolvable front matter\n`,
    );
    return;
  }
  for (const problem of problems) process.stderr.write(`  ${problem}\n`);
  process.stderr.write(
    '\nA dantotsu is the record of a defect and of the change that removed it. ' +
      'The fields above are what the weak-point map and the recurrence list read, ' +
      'and a commit that does not resolve on main, a placeholder, or a level the ' +
      'eradication paths do not support is a record nobody can check. ' +
      'The contract is in plugins/borso-harness/skills/dantotsu/standard.md. ' +
      'A shallow clone resolves no old commit: run `git fetch --unshallow` first.\n',
  );
  process.exitCode = 1;
}

main();
