#!/usr/bin/env tsx
/**
 * Map blueprint coverage across the repository.
 *
 * Usage:
 *   pnpm exec tsx .claude/skills/blueprint/blueprint-heatmap.ts
 *
 * Where `blueprint-indexing.ts` answers "which patterns exist", this answers
 * "which code carries one". Every source file is bucketed by application and
 * layer, then counted as carrying a `@Blueprint`, carrying a
 * `@FollowsBlueprint`, or carrying neither, and the result is written to
 * `blueprint-coverage.md`.
 *
 * Adapted from the `blueprint` skill in pernod-ricard-rgm/pr-aquila-ap-v2.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractFollowsBlueprint,
  inferApplication,
  inferLayer,
  inferProject,
  isTestFile,
  type BlueprintProject,
} from './blueprint-utils.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(scriptDirectory, '../../..');
const SCAN_DIRECTORY_NAMES = ['apps', 'infra', 'eslint-rules'];
const OUTPUT_FILE = path.join(scriptDirectory, 'blueprint-coverage.md');
const SKIPPED_DIRECTORY_NAMES = new Set([
  'node_modules',
  'dist',
  'cdk.out',
  'coverage',
  '.stryker-tmp',
  'migrations',
  'public',
]);
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js'];

/**
 * Ambient declaration files describe types the compiler already knows how to
 * read. There is no pattern to copy in one, so they are counted and reported
 * separately rather than dragging every layer's percentage down.
 */
const LAYER_EXCLUDED_FROM_COVERAGE = 'declaration';

const BLUEPRINT_ID_PATTERN = /@Blueprint\s+(\S+)/g;
const COVERAGE_BAR_SEGMENTS = 20;
const PERCENTAGE_SCALE = 100;

interface MarkedFile {
  readonly filePath: string;
  readonly application: string;
  readonly project: BlueprintProject;
  readonly layer: string;
  readonly isTest: boolean;
  readonly blueprintCount: number;
  readonly followerCount: number;
}

interface CoverageBucket {
  readonly application: string;
  readonly project: BlueprintProject;
  readonly layer: string;
  files: number;
  blueprints: number;
  followers: number;
  markedFiles: number;
  readonly unmarkedPaths: string[];
}

function listSourceFiles(directory: string): string[] {
  const files: string[] = [];
  function walk(currentDirectory: string): void {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const fullPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
          walk(fullPath);
        }
      } else if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
        files.push(fullPath);
      }
    }
  }
  walk(directory);
  return files;
}

function readMarkedFile(absolutePath: string): MarkedFile {
  const content = fs.readFileSync(absolutePath, 'utf8');
  const relativePath = path.relative(REPOSITORY_ROOT, absolutePath);
  return {
    filePath: relativePath,
    application: inferApplication(relativePath),
    project: inferProject(relativePath),
    layer: inferLayer(relativePath),
    isTest: isTestFile(relativePath),
    blueprintCount: [...content.matchAll(BLUEPRINT_ID_PATTERN)].length,
    followerCount: extractFollowsBlueprint(content).length,
  };
}

function bucketKeyOf(file: MarkedFile): string {
  return `${file.application}|${file.project}|${file.layer}`;
}

function collectBuckets(files: readonly MarkedFile[]): Map<string, CoverageBucket> {
  const buckets = new Map<string, CoverageBucket>();
  for (const file of files) {
    const key = bucketKeyOf(file);
    const existing = buckets.get(key) ?? {
      application: file.application,
      project: file.project,
      layer: file.layer,
      files: 0,
      blueprints: 0,
      followers: 0,
      markedFiles: 0,
      unmarkedPaths: [],
    };
    existing.files += 1;
    existing.blueprints += file.blueprintCount;
    existing.followers += file.followerCount;
    if (file.blueprintCount + file.followerCount > 0) {
      existing.markedFiles += 1;
    } else {
      existing.unmarkedPaths.push(file.filePath);
    }
    buckets.set(key, existing);
  }
  return buckets;
}

function toPercentage(marked: number, total: number): number {
  return total === 0 ? PERCENTAGE_SCALE : Math.round((marked / total) * PERCENTAGE_SCALE);
}

function toCoverageBar(marked: number, total: number): string {
  const percentage = toPercentage(marked, total);
  const filled = Math.round((percentage / PERCENTAGE_SCALE) * COVERAGE_BAR_SEGMENTS);
  return `${'█'.repeat(filled)}${'░'.repeat(COVERAGE_BAR_SEGMENTS - filled)} ${percentage}%`;
}

function isCounted(bucket: CoverageBucket): boolean {
  return bucket.layer !== LAYER_EXCLUDED_FROM_COVERAGE;
}

function sumBy(
  buckets: readonly CoverageBucket[],
  read: (bucket: CoverageBucket) => number,
): number {
  return buckets.reduce((total, bucket) => total + read(bucket), 0);
}

function toGroupedRows(
  buckets: readonly CoverageBucket[],
  groupOf: (bucket: CoverageBucket) => string,
): string {
  const groups = new Map<string, CoverageBucket[]>();
  for (const bucket of buckets) {
    const group = groupOf(bucket);
    groups.set(group, [...(groups.get(group) ?? []), bucket]);
  }
  return [...groups.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([group, members]) => {
      const files = sumBy(members, (bucket) => bucket.files);
      const marked = sumBy(members, (bucket) => bucket.markedFiles);
      return `| ${group} | ${files} | ${sumBy(members, (bucket) => bucket.blueprints)} | ${sumBy(members, (bucket) => bucket.followers)} | ${files - marked} | ${toCoverageBar(marked, files)} |`;
    })
    .join('\n');
}

function toGridRows(buckets: readonly CoverageBucket[]): string {
  return [...buckets]
    .sort(
      (first, second) =>
        first.application.localeCompare(second.application) ||
        first.project.localeCompare(second.project) ||
        first.layer.localeCompare(second.layer),
    )
    .map(
      (bucket) =>
        `| ${bucket.application} | ${bucket.project} | ${bucket.layer} | ${bucket.files} | ${bucket.blueprints} | ${bucket.followers} | ${bucket.files - bucket.markedFiles} | ${toCoverageBar(bucket.markedFiles, bucket.files)} |`,
    )
    .join('\n');
}

function toUnmarkedSection(buckets: readonly CoverageBucket[]): string {
  const withGaps = [...buckets]
    .filter((bucket) => bucket.unmarkedPaths.length > 0)
    .sort((first, second) => second.unmarkedPaths.length - first.unmarkedPaths.length);
  if (withGaps.length === 0) {
    return 'Every file in a covered layer carries a blueprint or a follower marker.';
  }
  return withGaps
    .map((bucket) => {
      const heading = `### ${bucket.application} / ${bucket.project} / ${bucket.layer} — ${bucket.unmarkedPaths.length} unmarked`;
      const list = [...bucket.unmarkedPaths].sort().map((filePath) => `- \`${filePath}\``);
      return [heading, '', ...list].join('\n');
    })
    .join('\n\n');
}

function generateMarkdown(files: readonly MarkedFile[]): string {
  const allBuckets = [...collectBuckets(files).values()];
  const counted = allBuckets.filter((bucket) => isCounted(bucket));
  const declarationFiles = sumBy(
    allBuckets.filter((bucket) => !isCounted(bucket)),
    (bucket) => bucket.files,
  );
  const totalFiles = sumBy(counted, (bucket) => bucket.files);
  const totalMarked = sumBy(counted, (bucket) => bucket.markedFiles);
  const testFiles = files.filter((file) => file.isTest).length;

  return `# Blueprint coverage

Auto-generated by \`.claude/skills/blueprint/blueprint-heatmap.ts\`. Do not edit
by hand. Run \`/blueprint heatmap\` after adding or changing an annotation.

Where [\`blueprint-index.md\`](./blueprint-index.md) answers which patterns
exist, this answers which code carries one. A file counts as marked when it
holds a \`@Blueprint\` block or a \`// @FollowsBlueprint\` comment, so an
unmarked file is either a pattern nobody has written down yet or code that no
existing pattern fits.

Ambient declaration files are excluded from every percentage below, because
there is no shape to copy in one. ${declarationFiles} file(s) are excluded on
that ground.

## Repository totals

| Files | Blueprints | Followers | Unmarked | Marked |
|-------|------------|-----------|----------|--------|
| ${totalFiles} | ${sumBy(counted, (bucket) => bucket.blueprints)} | ${sumBy(counted, (bucket) => bucket.followers)} | ${totalFiles - totalMarked} | ${toCoverageBar(totalMarked, totalFiles)} |

Of those files, ${testFiles} are tests and ${totalFiles - testFiles} are the code
they cover.

## Coverage by application

| Application | Files | Blueprints | Followers | Unmarked | Marked |
|-------------|-------|------------|-----------|----------|--------|
${toGroupedRows(counted, (bucket) => bucket.application)}

## Coverage by layer

| Layer | Files | Blueprints | Followers | Unmarked | Marked |
|-------|-------|------------|-----------|----------|--------|
${toGroupedRows(counted, (bucket) => bucket.layer)}

## Coverage by application and layer

| Application | Project | Layer | Files | Blueprints | Followers | Unmarked | Marked |
|-------------|---------|-------|-------|------------|-----------|----------|--------|
${toGridRows(counted)}

## Unmarked files

${toUnmarkedSection(counted)}
`;
}

function main(): void {
  const isCheckOnly = process.argv.includes('--check');
  const sourceFiles = SCAN_DIRECTORY_NAMES.map((name) => path.join(REPOSITORY_ROOT, name))
    .filter((directory) => fs.existsSync(directory))
    .flatMap((directory) => listSourceFiles(directory));
  const markedFiles = sourceFiles.map((file) => readMarkedFile(file));

  const blueprints = markedFiles.reduce((total, file) => total + file.blueprintCount, 0);
  const followers = markedFiles.reduce((total, file) => total + file.followerCount, 0);
  process.stdout.write(
    `Scanned ${markedFiles.length} source files: ${blueprints} blueprint(s), ${followers} follower(s).\n`,
  );

  const markdown = generateMarkdown(markedFiles);
  const relativeOutput = path.relative(REPOSITORY_ROOT, OUTPUT_FILE);

  if (isCheckOnly) {
    const onDisk = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
    if (onDisk !== markdown) {
      process.stderr.write(
        `${relativeOutput} is out of date. Run \`pnpm exec tsx .claude/skills/blueprint/blueprint-heatmap.ts\`.\n`,
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${relativeOutput} is up to date.\n`);
    return;
  }

  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
  process.stdout.write(`Wrote ${relativeOutput}\n`);
}

main();
