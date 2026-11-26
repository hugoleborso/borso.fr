#!/usr/bin/env tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readDantotsuCorpus } from '../quality/dantotsu-corpus';
import { readField, readListValue } from '../quality/dantotsu-record.core';
import {
  countDefectsByBlueprint,
  readBlueprintAnnotations,
  renderDefectReport,
  rankBlueprintRisk,
  selectUnknownBlueprintReferences,
  type BlueprintAdoption,
  type DantotsuReference,
} from './defects.core';

const REPOSITORY_ROOT = process.cwd();
const OUTPUT_FILE = path.join(REPOSITORY_ROOT, 'docs', 'standards', 'blueprint-defects.md');
const SCAN_DIRECTORIES = ['apps', 'infra', 'eslint-rules'];
const SKIPPED_DIRECTORY_NAMES = new Set([
  'node_modules',
  'dist',
  'cdk.out',
  'coverage',
  'migrations',
  'public',
]);

function listSourceFiles(directory: string): string[] {
  return fs
    .globSync('**/*.{ts,tsx,js}', {
      cwd: directory,
      exclude: (name) => SKIPPED_DIRECTORY_NAMES.has(path.basename(name)),
    })
    .map((file) => path.join(directory, file));
}

function readAdoptions(): readonly BlueprintAdoption[] {
  const followerCounts = new Map<string, number>();
  const adoptions: BlueprintAdoption[] = [];
  const allFilesIncludingTests = SCAN_DIRECTORIES.flatMap((name) =>
    listSourceFiles(path.join(REPOSITORY_ROOT, name)),
  );

  for (const absolutePath of allFilesIncludingTests) {
    for (const match of fs
      .readFileSync(absolutePath, 'utf8')
      .matchAll(/@FollowsBlueprint\s+(\S+)/g)) {
      const id = match[1];
      if (id !== undefined) followerCounts.set(id, (followerCounts.get(id) ?? 0) + 1);
    }
  }

  for (const absolutePath of allFilesIncludingTests) {
    for (const annotation of readBlueprintAnnotations(fs.readFileSync(absolutePath, 'utf8'))) {
      adoptions.push({
        blueprintId: annotation.id,
        name: annotation.name,
        followers: followerCounts.get(annotation.id) ?? 0,
      });
    }
  }
  return adoptions;
}

function main(): void {
  const adoptions = readAdoptions();
  const knownBlueprintIds = new Set(adoptions.map((adoption) => adoption.blueprintId));

  const references: readonly DantotsuReference[] = readDantotsuCorpus().map((document) => ({
    slug: document.slug,
    blueprintIds: readListValue(readField(document, 'blueprints')) ?? [],
  }));

  const problems = selectUnknownBlueprintReferences(references, knownBlueprintIds);
  const risks = rankBlueprintRisk(adoptions, countDefectsByBlueprint(references));
  const rendered = renderDefectReport(risks, references.length);

  for (const problem of problems) process.stderr.write(`  ${problem}\n`);

  fs.writeFileSync(OUTPUT_FILE, rendered, 'utf8');
  if (problems.length > 0) process.exitCode = 1;
  if (!process.argv.includes('--check')) {
    process.stdout.write(
      `Wrote docs/standards/blueprint-defects.md (${String(risks.length)} blueprint(s) with a defect).\n`,
    );
  } else if (problems.length === 0) {
    process.stdout.write('Every dantotsu blueprint reference resolves.\n');
  }
}

main();
