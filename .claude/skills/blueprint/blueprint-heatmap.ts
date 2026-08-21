#!/usr/bin/env tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCoveragePage } from './blueprint-coverage-page.js';
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
const OUTPUT_FILE = path.join(scriptDirectory, 'blueprint-coverage.html');
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

const LAYER_EXCLUDED_FROM_COVERAGE = 'declaration';

const BLUEPRINT_ID_PATTERN = /@Blueprint\s+(\S+)/g;

interface MarkedFile {
  readonly filePath: string;
  readonly application: string;
  readonly project: BlueprintProject;
  readonly layer: string;
  readonly isTest: boolean;
  readonly blueprintCount: number;
  readonly followerCount: number;
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

interface BucketTally {
  application: string;
  layer: string;
  files: number;
  blueprints: number;
  followers: number;
  markedFiles: number;
  unmarkedPaths: string[];
}

function collectBuckets(files: readonly MarkedFile[]): Map<string, BucketTally> {
  const buckets = new Map<string, BucketTally>();
  for (const file of files) {
    const key = bucketKeyOf(file);
    const existing = buckets.get(key) ?? {
      application: file.application,
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

function isCounted(bucket: BucketTally): boolean {
  return bucket.layer !== LAYER_EXCLUDED_FROM_COVERAGE;
}

function generatePage(files: readonly MarkedFile[]): string {
  const allBuckets = [...collectBuckets(files).values()];
  const counted = allBuckets.filter((bucket) => isCounted(bucket));
  const declarationFiles = allBuckets
    .filter((bucket) => !isCounted(bucket))
    .reduce((total, bucket) => total + bucket.files, 0);
  return renderCoveragePage(counted, declarationFiles, files.filter((file) => file.isTest).length);
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

  const page = generatePage(markedFiles);
  const relativeOutput = path.relative(REPOSITORY_ROOT, OUTPUT_FILE);

  if (isCheckOnly) {
    const onDisk = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
    if (onDisk !== page) {
      process.stderr.write(
        `${relativeOutput} is out of date. Run \`pnpm exec tsx .claude/skills/blueprint/blueprint-heatmap.ts\`.\n`,
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${relativeOutput} is up to date.\n`);
    return;
  }

  fs.writeFileSync(OUTPUT_FILE, page, 'utf8');
  process.stdout.write(`Wrote ${relativeOutput}\n`);
}

main();
