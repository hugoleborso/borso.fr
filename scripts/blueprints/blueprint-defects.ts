#!/usr/bin/env tsx
/**
 * Generates `docs/standards/blueprint-defects.md`, and with `--check` fails on
 * a dantotsu naming a blueprint that does not exist, or a stale page.
 *
 * Usage:
 *   pnpm exec tsx scripts/blueprints/blueprint-defects.ts [--check]
 *
 * The blueprint identifiers come from the same annotations
 * `blueprint-indexing.ts` reads, so a renamed blueprint breaks the link here
 * rather than leaving a dantotsu pointing at nothing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  countDefectsByBlueprint,
  readBlueprintAnnotations,
  readDantotsuReference,
  renderDefectReport,
  rankBlueprintRisk,
  selectUnknownBlueprintReferences,
  type BlueprintAdoption,
} from './defects.core';

const REPOSITORY_ROOT = process.cwd();
const DANTOTSUS_DIRECTORY = path.join(REPOSITORY_ROOT, 'docs', 'dantotsus');
const OUTPUT_FILE = path.join(REPOSITORY_ROOT, 'docs', 'standards', 'blueprint-defects.md');
const SCAN_DIRECTORIES = ['apps', 'infra', 'eslint-rules'];
const SKIPPED_DIRECTORY_NAMES = new Set([
  'node_modules',
  'dist',
  'cdk.out',
  'coverage',
  '.stryker-tmp',
  'migrations',
  'public',
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js']);
const NON_DANTOTSU_FILES = new Set(['README.md', '_template.md']);

function listSourceFiles(directory: string): string[] {
  const found: string[] = [];
  if (!fs.existsSync(directory)) return found;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...listSourceFiles(entryPath));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) found.push(entryPath);
  }
  return found;
}

function readAdoptions(): readonly BlueprintAdoption[] {
  const followerCounts = new Map<string, number>();
  const adoptions: BlueprintAdoption[] = [];
  const allFiles = SCAN_DIRECTORIES.flatMap((name) =>
    listSourceFiles(path.join(REPOSITORY_ROOT, name)),
  );

  for (const absolutePath of allFiles) {
    for (const match of fs
      .readFileSync(absolutePath, 'utf8')
      .matchAll(/@FollowsBlueprint\s+(\S+)/g)) {
      const id = match[1];
      if (id !== undefined) followerCounts.set(id, (followerCounts.get(id) ?? 0) + 1);
    }
  }

  // Every annotation in every file, tests included. A blueprint that lives in
  // a test file is still a blueprint — `test-lint-rule` has thirty followers —
  // and reading only the first annotation loses the second, which
  // `songs.queries.ts` carries.
  for (const absolutePath of allFiles) {
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

  const references = fs
    .readdirSync(DANTOTSUS_DIRECTORY)
    .filter((name) => name.endsWith('.md') && !NON_DANTOTSU_FILES.has(name))
    .sort()
    .map((name) =>
      readDantotsuReference(
        name.replace(/\.md$/, ''),
        fs.readFileSync(path.join(DANTOTSUS_DIRECTORY, name), 'utf8'),
      ),
    );

  const problems = selectUnknownBlueprintReferences(references, knownBlueprintIds);
  const risks = rankBlueprintRisk(adoptions, countDefectsByBlueprint(references));
  const rendered = renderDefectReport(risks, references.length);

  for (const problem of problems) process.stderr.write(`  ${problem}\n`);

  if (process.argv.includes('--check')) {
    const onDisk = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
    if (onDisk !== rendered) {
      process.stderr.write(
        '  docs/standards/blueprint-defects.md is out of date. Run `pnpm exec tsx scripts/blueprints/blueprint-defects.ts`.\n',
      );
      process.exitCode = 1;
      return;
    }
    if (problems.length > 0) {
      process.exitCode = 1;
      return;
    }
    process.stdout.write('Every dantotsu blueprint reference resolves.\n');
    return;
  }

  fs.writeFileSync(OUTPUT_FILE, rendered, 'utf8');
  process.stdout.write(
    `Wrote docs/standards/blueprint-defects.md (${String(risks.length)} blueprint(s) with a defect).\n`,
  );
  if (problems.length > 0) process.exitCode = 1;
}

main();
