/**
 * Shared utilities for the blueprint scripts.
 *
 * Project and layer are inferred from the file path, and the layer names match
 * the Layer Reference table that `blueprint-indexing.ts` writes into
 * `blueprint-index.md`.
 *
 * Adapted from the `blueprint` skill in pernod-ricard-rgm/pr-aquila-ap-v2. The
 * inference here follows this repository's layout, which is `apps/<slug>/api`
 * and `apps/<slug>/site` per application, the shared CDK packages under
 * `infra/`, and the custom lint rules under `eslint-rules/`.
 */

export type BlueprintProject = 'api' | 'site' | 'domain' | 'cdk' | 'infra' | 'tooling';

const API_PATH_SEGMENT = '/api/src/';
const DOMAIN_PATH_SEGMENT = '/domain/';
const CDK_PATH_SEGMENT = '/cdk/';
const TOOLING_PATH_PREFIX = 'eslint-rules/';

export function inferProject(filePath: string): BlueprintProject {
  if (filePath.startsWith('infra/')) {
    return 'infra';
  }
  if (filePath.startsWith(TOOLING_PATH_PREFIX)) {
    return 'tooling';
  }
  if (filePath.includes(API_PATH_SEGMENT)) {
    return 'api';
  }
  if (filePath.includes(DOMAIN_PATH_SEGMENT)) {
    return 'domain';
  }
  if (filePath.includes(CDK_PATH_SEGMENT)) {
    return 'cdk';
  }
  return 'site';
}

/** The application slug, e.g. `pragma`, or `infra` for the shared packages. */
export function inferApplication(filePath: string): string {
  const match = /^apps\/([^/]+)\//.exec(filePath);
  if (match !== null) {
    return match[1];
  }
  if (filePath.startsWith(TOOLING_PATH_PREFIX)) {
    return 'eslint-rules';
  }
  const infraMatch = /^infra\/([^/]+)\//.exec(filePath);
  return infraMatch === null ? 'unknown' : `infra-${infraMatch[1]}`;
}

export const LAYER_BY_FILE_SUFFIX: readonly (readonly [string, string])[] = [
  ['.controller.ts', 'controller'],
  ['.service.ts', 'service'],
  ['.repository.ts', 'repository'],
  ['.middleware.ts', 'middleware'],
  ['.schema.ts', 'schema'],
  ['.core.ts', 'core'],
  ['.utils.ts', 'utils'],
  ['.types.ts', 'types'],
  ['.environment.ts', 'environment'],
  ['.queries.ts', 'query'],
  ['.hook.ts', 'hook'],
  ['.store.ts', 'store'],
  ['.adapter.ts', 'adapter'],
  ['.client.ts', 'client'],
  ['.setup.ts', 'setup'],
  ['.variants.ts', 'variants'],
  ['.d.ts', 'declaration'],
  ['.config.ts', 'config'],
];

/**
 * Composition roots, which are named by convention rather than by suffix. Each
 * entry is matched against the end of the path, so `main.ts` only counts as an
 * entry point where it sits directly under a container's source root.
 */
export const ENTRY_POINT_PATH_SUFFIXES: readonly string[] = [
  '/api/src/app.ts',
  '/api/src/main.ts',
  '/api/src/main.dev.ts',
  '/site/src/main.tsx',
  '/site/src/App.tsx',
  '/cdk/bin/cdk.ts',
  '/cdk/lib/stack.ts',
  '/bin/app.ts',
  '/bin/shared.ts',
];

export const LAYER_BY_PATH_SEGMENT: readonly (readonly [string, string])[] = [
  ['eslint-rules/', 'lint-rule'],
  ['infra/shared/lib/', 'stack'],
  ['/components/atoms/', 'atom'],
  ['/components/molecules/', 'molecule'],
  ['/components/organisms/', 'organism'],
  ['/routes/', 'route'],
  ['/lib/queries/', 'query'],
  ['/i18n/', 'i18n'],
  ['/database/', 'database'],
  ['/constructs/', 'construct'],
];

const TEST_FILE_PATTERN = /\.test\.(ts|tsx|js)$/;
const TEST_HELPER_PATTERN =
  /(\.test-utils\.tsx?|\/test-setup\.tsx?$|^apps\/[^/]+\/test\/|\/test\/(unit\/)?(fixtures|helpers)\/)/;

/** Whether the file is a test rather than the code under test. */
export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath) || TEST_HELPER_PATTERN.test(filePath);
}

/**
 * The layer a file belongs to. A test is reported in the layer of the code it
 * covers, so `punch.core.test.ts` reads as `core` rather than as its own thing,
 * which keeps the coverage map one grid instead of two.
 */
export function inferLayer(filePath: string): string {
  const pathWithoutTestSuffix = filePath.replace(TEST_FILE_PATTERN, '.$1');
  for (const entryPointSuffix of ENTRY_POINT_PATH_SUFFIXES) {
    if (pathWithoutTestSuffix.endsWith(entryPointSuffix)) {
      return 'entrypoint';
    }
  }
  for (const [segment, layer] of LAYER_BY_PATH_SEGMENT) {
    if (pathWithoutTestSuffix.includes(segment)) {
      return layer;
    }
  }
  for (const [suffix, layer] of LAYER_BY_FILE_SUFFIX) {
    if (pathWithoutTestSuffix.endsWith(suffix)) {
      return layer;
    }
  }
  return 'unknown';
}

export interface FollowsBlueprintEntry {
  readonly blueprintId: string;
  readonly lineNumber: number;
}

/**
 * A marker line, in either comment style, followed by identifiers only.
 *
 * Two things this gets right that the first version did not. It accepts the
 * JSDoc form as well as the line-comment form, because `@Blueprint` is written
 * inside a JSDoc block and a reader naturally writes its counterpart the same
 * way, where it was silently invisible. And the identifiers are matched as
 * identifiers rather than as "the rest of the line", which is what made this
 * file count a sentence in its own documentation as a follower of a blueprint
 * called `id\` comments out of a file, returning one entry`.
 */
const FOLLOWS_BLUEPRINT_PATTERN =
  /(?:\/\/|^\s*\*)\s*@FollowsBlueprint\s+([A-Za-z0-9][\w-]*(?:\s+[A-Za-z0-9][\w-]*)*)\s*$/;

/**
 * Parse `@FollowsBlueprint id` markers out of a file, returning one entry per
 * identifier with the line it sits on.
 */
export function extractFollowsBlueprint(fileContent: string): FollowsBlueprintEntry[] {
  const entries: FollowsBlueprintEntry[] = [];
  const lines = fileContent.split('\n');
  for (const [index, line] of lines.entries()) {
    const match = FOLLOWS_BLUEPRINT_PATTERN.exec(line);
    if (match === null) {
      continue;
    }
    const namedIds = match[1];
    if (namedIds === undefined) continue;
    for (const blueprintId of namedIds.trim().split(/\s+/)) {
      entries.push({ blueprintId, lineNumber: index + 1 });
    }
  }
  return entries;
}

/** The parts of a parsed `@Blueprint` block that have to be complete. */
export interface AnnotatedBlueprint {
  readonly id: string;
  readonly hasName: boolean;
  readonly usage: string;
  readonly description: string;
  readonly filePath: string;
  readonly lineNumber: number;
}

export interface LocatedFollower {
  readonly blueprintId: string;
  readonly filePath: string;
  readonly lineNumber: number;
}

/**
 * The usage line answers "when do I reach for this", so it starts with the
 * instruction. `Use for a ...` and `Use whenever ...` both read correctly and
 * both appear in the repository, so the check is on the verb rather than on the
 * preposition after it.
 */
const REQUIRED_USAGE_PREFIX = 'Use ';

function locationOf(entry: { readonly filePath: string; readonly lineNumber: number }): string {
  return `${entry.filePath}:${entry.lineNumber}`;
}

/**
 * The indexer reads each tag within five lines either side of its `@Blueprint`
 * line and keeps the last match, so two blocks closer than that silently take
 * each other's name, usage, or description. Both entries still look complete in
 * the index, which is why this has to be checked rather than eyeballed.
 */
const MINIMUM_LINES_BETWEEN_BLUEPRINTS = 11;

function listCollidingBlueprints(blueprints: readonly AnnotatedBlueprint[]): string[] {
  const byFile = new Map<string, AnnotatedBlueprint[]>();
  for (const blueprint of blueprints) {
    byFile.set(blueprint.filePath, [...(byFile.get(blueprint.filePath) ?? []), blueprint]);
  }

  const problems: string[] = [];
  for (const declarations of byFile.values()) {
    const ordered = [...declarations].sort((first, second) => first.lineNumber - second.lineNumber);
    for (const [index, blueprint] of ordered.entries()) {
      const next = ordered[index + 1];
      if (
        next !== undefined &&
        next.lineNumber - blueprint.lineNumber < MINIMUM_LINES_BETWEEN_BLUEPRINTS
      ) {
        problems.push(
          `${locationOf(blueprint)}: \`${blueprint.id}\` and \`${next.id}\` at line ${next.lineNumber} are closer than ${MINIMUM_LINES_BETWEEN_BLUEPRINTS} lines, so they read each other's tags.`,
        );
      }
    }
  }
  return problems;
}

/**
 * Everything wrong with the annotations, one line each.
 *
 * A blueprint missing a tag still lands in the index with an empty cell, and a
 * follower naming nothing still reads as adoption, so neither shows up as a
 * failure without this. The `--check` flag turns the list into an exit code,
 * which is what the pre-commit hook and CI run.
 */
export function listAnnotationProblems(
  blueprints: readonly AnnotatedBlueprint[],
  followers: readonly LocatedFollower[],
): string[] {
  const problems: string[] = [];
  const blueprintsById = new Map<string, AnnotatedBlueprint[]>();
  for (const blueprint of blueprints) {
    blueprintsById.set(blueprint.id, [...(blueprintsById.get(blueprint.id) ?? []), blueprint]);

    if (!blueprint.hasName) {
      problems.push(`${locationOf(blueprint)}: \`${blueprint.id}\` has no @BlueprintName.`);
    }
    if (blueprint.usage === '') {
      problems.push(`${locationOf(blueprint)}: \`${blueprint.id}\` has no @BlueprintUsage.`);
    } else if (!blueprint.usage.startsWith(REQUIRED_USAGE_PREFIX)) {
      problems.push(
        `${locationOf(blueprint)}: \`${blueprint.id}\` @BlueprintUsage must start with "${REQUIRED_USAGE_PREFIX.trim()}", so it reads as when to reach for the pattern.`,
      );
    }
    if (blueprint.description === '') {
      problems.push(`${locationOf(blueprint)}: \`${blueprint.id}\` has no @BlueprintDescription.`);
    }
  }

  for (const [id, declarations] of blueprintsById) {
    if (declarations.length > 1) {
      problems.push(
        `\`${id}\` is declared ${declarations.length} times: ${declarations.map(locationOf).join(', ')}.`,
      );
    }
  }

  problems.push(...listCollidingBlueprints(blueprints));

  for (const follower of followers) {
    if (!blueprintsById.has(follower.blueprintId)) {
      problems.push(
        `${locationOf(follower)}: follower names \`${follower.blueprintId}\`, which no @Blueprint declares.`,
      );
    }
  }

  return problems;
}
