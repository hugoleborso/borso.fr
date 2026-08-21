#!/usr/bin/env tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANNOTATION_SEARCH_RADIUS_LINES,
  type BlueprintProject,
  extractFollowsBlueprint,
  inferApplication,
  inferLayer,
  inferProject,
  listAnnotationProblems,
  resolveAnnotationSubject,
} from './blueprint-utils.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(scriptDirectory, '../../..');
const SCAN_DIRECTORIES = ['apps', 'infra', 'eslint-rules'].map((name) =>
  path.join(REPOSITORY_ROOT, name),
);
const OUTPUT_FILE = path.join(scriptDirectory, 'blueprint-index.md');
const SUBJECT_BASELINE_FILE = path.join(
  REPOSITORY_ROOT,
  'docs',
  'standards',
  'blueprint-subjects.json',
);
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

const BLUEPRINT_ID_PATTERN = /@Blueprint\s+(\S+)/;
const BLUEPRINT_NAME_PATTERN = /@BlueprintName\s+(.+)/;
const BLUEPRINT_USAGE_PATTERN = /@BlueprintUsage\s+(.+)/;
const BLUEPRINT_DESCRIPTION_PATTERN = /@BlueprintDescription\s+(.+)/;

interface Blueprint {
  readonly id: string;
  readonly name: string;
  readonly hasName: boolean;
  readonly usage: string;
  readonly description: string;
  readonly filePath: string;
  readonly lineNumber: number;
  readonly layer: string;
  readonly project: BlueprintProject;
  readonly application: string;
}

interface FollowerReference {
  readonly blueprintId: string;
  readonly filePath: string;
  readonly lineNumber: number;
  readonly subject: string;
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

function readTagWithinBlock(
  lines: readonly string[],
  centreIndex: number,
  pattern: RegExp,
): string {
  const firstIndex = Math.max(0, centreIndex - ANNOTATION_SEARCH_RADIUS_LINES);
  const lastIndex = Math.min(lines.length, centreIndex + ANNOTATION_SEARCH_RADIUS_LINES);
  let found = '';
  for (let index = firstIndex; index < lastIndex; index++) {
    const line = lines[index];
    if (line === undefined) continue;
    const captured = pattern.exec(line)?.[1];
    if (captured !== undefined) {
      found = captured.trim();
    }
  }
  return found;
}

function extractBlueprints(absolutePath: string): Blueprint[] {
  const lines = fs.readFileSync(absolutePath, 'utf8').split('\n');
  const relativePath = path.relative(REPOSITORY_ROOT, absolutePath);
  const blueprints: Blueprint[] = [];

  for (const [index, line] of lines.entries()) {
    const idMatch = BLUEPRINT_ID_PATTERN.exec(line);
    if (idMatch === null) {
      continue;
    }
    const id = idMatch[1];
    if (id === undefined) continue;
    const name = readTagWithinBlock(lines, index, BLUEPRINT_NAME_PATTERN);
    blueprints.push({
      id,
      name: name === '' ? id : name,
      hasName: name !== '',
      usage: readTagWithinBlock(lines, index, BLUEPRINT_USAGE_PATTERN),
      description: readTagWithinBlock(lines, index, BLUEPRINT_DESCRIPTION_PATTERN),
      filePath: relativePath,
      lineNumber: index + 1,
      layer: inferLayer(relativePath),
      project: inferProject(relativePath),
      application: inferApplication(relativePath),
    });
  }
  return blueprints;
}

function extractFollowers(absolutePath: string): FollowerReference[] {
  const content = fs.readFileSync(absolutePath, 'utf8');
  const relativePath = path.relative(REPOSITORY_ROOT, absolutePath);
  return extractFollowsBlueprint(content).map((entry) => ({
    blueprintId: entry.blueprintId,
    filePath: relativePath,
    lineNumber: entry.lineNumber,
    subject: resolveAnnotationSubject(content, entry.lineNumber),
  }));
}

function countFollowersByBlueprintId(followers: readonly FollowerReference[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const follower of followers) {
    counts.set(follower.blueprintId, (counts.get(follower.blueprintId) ?? 0) + 1);
  }
  return counts;
}

function toIndexRow(blueprint: Blueprint, followerCount: number): string {
  const fileName = path.basename(blueprint.filePath);
  const linkTarget = path.relative(scriptDirectory, path.join(REPOSITORY_ROOT, blueprint.filePath));
  const location = `[${fileName}:L${blueprint.lineNumber}](${linkTarget}#L${blueprint.lineNumber})`;
  return [
    blueprint.id,
    blueprint.application,
    blueprint.project,
    blueprint.layer,
    blueprint.name,
    blueprint.usage,
    blueprint.description,
    String(followerCount),
    location,
  ]
    .map((cell) => ` ${cell} `)
    .join('|')
    .replace(/^/, '|')
    .concat('|');
}

function generateMarkdown(
  blueprints: readonly Blueprint[],
  followers: readonly FollowerReference[],
): string {
  const followerCounts = countFollowersByBlueprintId(followers);
  const knownIds = new Set(blueprints.map((blueprint) => blueprint.id));
  const orphanedFollowers = followers.filter((follower) => !knownIds.has(follower.blueprintId));

  const rows = [...blueprints]
    .sort((first, second) => first.id.localeCompare(second.id))
    .map((blueprint) => toIndexRow(blueprint, followerCounts.get(blueprint.id) ?? 0))
    .join('\n');

  const orphanedSection =
    orphanedFollowers.length === 0
      ? 'None.'
      : orphanedFollowers
          .map(
            (follower) =>
              `- \`${follower.blueprintId}\` referenced at \`${follower.filePath}:${follower.lineNumber}\` matches no \`@Blueprint\`.`,
          )
          .join('\n');

  return `# Blueprint index

Auto-generated by \`.claude/skills/blueprint/blueprint-indexing.ts\`. Do not edit
by hand. Run \`/blueprint index\` after adding or changing an annotation.

A blueprint is a canonical example that already lives in this repository, marked
in place with a \`@Blueprint\` JSDoc block. Code that follows one of them carries
a \`// @FollowsBlueprint <id>\` comment, and the follower count below shows how
widely each pattern has actually been adopted.

The rules a blueprint demonstrates are written down in
[\`docs/standards/\`](../../../docs/standards/README.md). The standard states the
rule, and the blueprint is the working example of it.

## Layer reference

Layer is inferred from the file path. Use the table to find the nearest
blueprint when the code you are writing has none of its own.

### Back end, \`apps/<slug>/api/src/\`

| Layer | File pattern | Holds |
|-------|--------------|-------|
| controller | \`*.controller.ts\` | Hono routes, no logic |
| service | \`*.service.ts\` | Orchestration, input and output |
| repository | \`*.repository.ts\` | Drizzle queries only |
| schema | \`*.schema.ts\` | Drizzle tables and Zod input schemas |
| core | \`*.core.ts\` | Pure domain rules, fully covered |
| middleware | \`*.middleware.ts\` | Hono middleware |
| environment | \`*.environment.ts\` | Environment reads kept out of pure files |
| database | \`database/**\` | Client and migrations |

### Front end, \`apps/<slug>/site/\`

| Layer | File pattern | Holds |
|-------|--------------|-------|
| atom | \`components/atoms/**\` | Primitives with no component children |
| molecule | \`components/molecules/**\` | A few atoms, one responsibility |
| organism | \`components/organisms/**\` | A screen region owning interface state |
| route | \`routes/**\` | Routing concerns, composing organisms |
| query | \`lib/queries/**\` | TanStack Query keys and hooks |
| i18n | \`i18n/**\` | Translation catalogues and setup |
| utils | \`*.utils.ts\` | Pure cross-cutting helpers, fully covered |

### Infrastructure, \`infra/\`

| Layer | File pattern | Holds |
|-------|--------------|-------|
| construct | \`src/constructs/**\` | Reusable CDK constructs |
| config | \`*.config.ts\` | Build, test, and migration tool configuration |

### Tooling, \`eslint-rules/\`

| Layer | File pattern | Holds |
|-------|--------------|-------|
| lint-rule | \`eslint-rules/**\` | One custom rule per file, beside its RuleTester suite |

A test is reported in the layer of the code it covers, so \`punch.core.test.ts\`
reads as \`core\`. How much of each layer carries a marker is in
[\`blueprint-coverage.html\`](./blueprint-coverage.html).

## Blueprints

| ID | App | Project | Layer | Name | Usage | Description | Followers | Location |
|----|-----|---------|-------|------|-------|-------------|-----------|----------|
${rows}

## Orphaned followers

${orphanedSection}
`;
}

type SubjectBaseline = Record<string, readonly string[]>;

function buildSubjectBaseline(followers: readonly FollowerReference[]): SubjectBaseline {
  const byBlueprintId = new Map<string, string[]>();
  for (const follower of followers) {
    const subjects = byBlueprintId.get(follower.blueprintId) ?? [];
    subjects.push(follower.subject);
    byBlueprintId.set(follower.blueprintId, subjects);
  }
  const baseline: Record<string, readonly string[]> = {};
  for (const blueprintId of [...byBlueprintId.keys()].sort()) {
    baseline[blueprintId] = (byBlueprintId.get(blueprintId) ?? []).toSorted();
  }
  return baseline;
}

function serialiseSubjectBaseline(baseline: SubjectBaseline): string {
  return `${JSON.stringify(baseline, null, 2)}\n`;
}

function listSubjectDrift(followers: readonly FollowerReference[]): string[] {
  if (!fs.existsSync(SUBJECT_BASELINE_FILE)) {
    return [
      `docs/standards/blueprint-subjects.json is missing. Run \`pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --accept\`.`,
    ];
  }
  const recorded: unknown = JSON.parse(fs.readFileSync(SUBJECT_BASELINE_FILE, 'utf8'));
  if (JSON.stringify(recorded) === JSON.stringify(buildSubjectBaseline(followers))) return [];
  return [
    'a `@FollowsBlueprint` marker names a different symbol than the baseline records. ' +
      'A marker is bound to its subject by position, so inserting a declaration under one moves ' +
      'the claim without changing any count. Read the diff of ' +
      'docs/standards/blueprint-subjects.json, and if the move is intended accept it in the same ' +
      'commit: `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --accept`.',
  ];
}

function main(): void {
  const isCheckOnly = process.argv.includes('--check');
  const isAccepting = process.argv.includes('--accept');
  const sourceFiles = SCAN_DIRECTORIES.flatMap((directory) =>
    fs.existsSync(directory) ? listSourceFiles(directory) : [],
  );

  const blueprints = sourceFiles.flatMap((file) => extractBlueprints(file));
  const followers = sourceFiles.flatMap((file) => extractFollowers(file));
  const markdown = generateMarkdown(blueprints, followers);
  const problems = listAnnotationProblems(blueprints, followers);

  if (isAccepting) {
    fs.writeFileSync(
      SUBJECT_BASELINE_FILE,
      serialiseSubjectBaseline(buildSubjectBaseline(followers)),
      'utf8',
    );
    process.stdout.write('Accepted the blueprint marker subjects on disk.\n');
  } else {
    problems.push(...listSubjectDrift(followers));
  }

  process.stdout.write(
    `Scanned ${sourceFiles.length} source files: ${blueprints.length} blueprint(s), ${followers.length} follower(s).\n`,
  );

  if (isCheckOnly) {
    const onDisk = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
    if (onDisk !== markdown) {
      problems.push(
        `${path.relative(REPOSITORY_ROOT, OUTPUT_FILE)} is out of date. Run \`pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts\`.`,
      );
    }
    for (const problem of problems) {
      process.stderr.write(`  ${problem}\n`);
    }
    if (problems.length > 0) {
      process.stderr.write(`\n${problems.length} blueprint annotation problem(s).\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write('Annotations are complete and the index is up to date.\n');
    return;
  }

  for (const blueprint of blueprints) {
    process.stdout.write(`  ${blueprint.id}: ${blueprint.name}\n`);
  }
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
  process.stdout.write(`Wrote ${path.relative(REPOSITORY_ROOT, OUTPUT_FILE)}\n`);
  for (const problem of problems) {
    process.stderr.write(`  ${problem}\n`);
  }
  if (problems.length > 0) {
    process.stderr.write(`\n${problems.length} blueprint annotation problem(s).\n`);
    process.exitCode = 1;
  }
}

main();
