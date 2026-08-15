#!/usr/bin/env tsx
/**
 * Writes `blueprint-context.json`, the lookup the blueprint seeding hook reads
 * when a new source file is about to be written.
 *
 * Usage:
 *   pnpm exec tsx .claude/skills/blueprint/blueprint-context.ts [--check]
 *
 * The hook could import `blueprint-utils.ts` directly and skip this file. It
 * does not, because starting `tsx` costs about a second, and the hook runs on
 * every Write. Paying that on each file write taxes a whole session to answer a
 * question whose answer changes only when an annotation changes. So the answer
 * is precomputed here and the hook resolves it with one `jq` call.
 *
 * The layer tables are emitted rather than restated, so the hook decides a
 * layer from the same data `inferLayer` uses and the two cannot drift.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENTRY_POINT_PATH_SUFFIXES,
  LAYER_BY_FILE_SUFFIX,
  LAYER_BY_PATH_SEGMENT,
  inferLayer,
  inferProject,
  isTestFile,
} from './blueprint-utils.js';
import { readBlueprintAnnotations } from '../../../scripts/blueprints/defects.core.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(scriptDirectory, '../../..');
const OUTPUT_FILE = path.join(scriptDirectory, 'blueprint-context.json');
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

/**
 * Which standard governs a layer. A hook that names the blueprint and not the
 * rule teaches the shape without the reason, and the reason is what tells you
 * when the shape does not apply.
 */
const STANDARD_BY_LAYER: Readonly<Record<string, string>> = {
  controller: 'docs/standards/04-backend-architecture.md',
  service: 'docs/standards/04-backend-architecture.md',
  repository: 'docs/standards/11-database.md',
  schema: 'docs/standards/11-database.md',
  middleware: 'docs/standards/04-backend-architecture.md',
  adapter: 'docs/standards/04-backend-architecture.md',
  core: 'docs/standards/02-purity-and-core-files.md',
  utils: 'docs/standards/02-purity-and-core-files.md',
  atom: 'docs/standards/05-frontend-architecture.md',
  molecule: 'docs/standards/05-frontend-architecture.md',
  organism: 'docs/standards/05-frontend-architecture.md',
  route: 'docs/standards/05-frontend-architecture.md',
  query: 'docs/standards/06-data-fetching.md',
  hook: 'docs/standards/07-state-and-effects.md',
  store: 'docs/standards/07-state-and-effects.md',
  variants: 'docs/standards/08-styling.md',
  i18n: 'docs/standards/09-i18n.md',
  construct: 'docs/standards/12-linting-and-gates.md',
  'lint-rule': 'docs/standards/12-linting-and-gates.md',
};

interface BlueprintSummary {
  readonly id: string;
  readonly name: string;
  readonly usage: string;
  readonly path: string;
  readonly followers: number;
}

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

function buildContext(): string {
  const blueprintsByKey = new Map<string, BlueprintSummary[]>();
  const followerCounts = new Map<string, number>();

  const allFiles = SCAN_DIRECTORIES.flatMap((name) =>
    listSourceFiles(path.join(REPOSITORY_ROOT, name)),
  );

  for (const absolutePath of allFiles) {
    const contents = fs.readFileSync(absolutePath, 'utf8');
    for (const match of contents.matchAll(/@FollowsBlueprint\s+(\S+)/g)) {
      const id = match[1];
      if (id !== undefined) followerCounts.set(id, (followerCounts.get(id) ?? 0) + 1);
    }
  }

  // Every annotation rather than the first, because one file can declare two:
  // `songs.queries.ts` carries both `query-module` and `query-optimistic-mutation`.
  //
  // A blueprint declared in a test file is bucketed under `test/`. `inferLayer`
  // deliberately reports a test in the layer of the code it covers, which keeps
  // the coverage map one grid, but it means `test-back-e2e` would otherwise be
  // the first thing offered to someone writing a controller. The hook never
  // seeds a test file, so these keys simply go unread.
  for (const absolutePath of allFiles) {
    const relativePath = path.relative(REPOSITORY_ROOT, absolutePath);
    const layerKey = `${inferProject(relativePath)}/${inferLayer(relativePath)}`;
    const key = isTestFile(relativePath) ? `test/${layerKey}` : layerKey;
    for (const annotation of readBlueprintAnnotations(fs.readFileSync(absolutePath, 'utf8'))) {
      const summaries = blueprintsByKey.get(key) ?? [];
      summaries.push({
        id: annotation.id,
        name: annotation.name,
        usage: annotation.usage,
        path: relativePath,
        followers: followerCounts.get(annotation.id) ?? 0,
      });
      blueprintsByKey.set(key, summaries);
    }
  }

  const blueprints: Record<string, BlueprintSummary[]> = {};
  for (const key of [...blueprintsByKey.keys()].sort()) {
    const summaries = blueprintsByKey.get(key) ?? [];
    blueprints[key] = [...summaries].sort((first, second) => second.followers - first.followers);
  }

  return `${JSON.stringify(
    {
      note: 'Generated by .claude/skills/blueprint/blueprint-context.ts. Read by .claude/hooks/pretool-blueprint-context.sh.',
      entryPointSuffixes: ENTRY_POINT_PATH_SUFFIXES,
      pathSegments: LAYER_BY_PATH_SEGMENT.map(([segment, layer]) => ({ segment, layer })),
      fileSuffixes: LAYER_BY_FILE_SUFFIX.map(([suffix, layer]) => ({ suffix, layer })),
      standardByLayer: STANDARD_BY_LAYER,
      blueprints,
    },
    null,
    2,
  )}\n`;
}

function main(): void {
  const rendered = buildContext();
  if (process.argv.includes('--check')) {
    const onDisk = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
    if (onDisk !== rendered) {
      process.stderr.write(
        '  .claude/skills/blueprint/blueprint-context.json is out of date. Run `pnpm exec tsx .claude/skills/blueprint/blueprint-context.ts`.\n',
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write('blueprint-context.json is up to date.\n');
    return;
  }
  fs.writeFileSync(OUTPUT_FILE, rendered, 'utf8');
  process.stdout.write(`Wrote ${path.relative(REPOSITORY_ROOT, OUTPUT_FILE)}\n`);
}

main();
