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

export function inferApplication(filePath: string): string {
  const application = /^apps\/([^/]+)\//.exec(filePath)?.[1];
  if (application !== undefined) {
    return application;
  }
  if (filePath.startsWith(TOOLING_PATH_PREFIX)) {
    return 'eslint-rules';
  }
  const infraPackage = /^infra\/([^/]+)\//.exec(filePath)?.[1];
  return infraPackage === undefined ? 'unknown' : `infra-${infraPackage}`;
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

export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath) || TEST_HELPER_PATTERN.test(filePath);
}

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

const FOLLOWS_BLUEPRINT_PATTERN =
  /(?:\/\/|^\s*\*)\s*@FollowsBlueprint\s+([A-Za-z0-9][\w-]*(?:\s+[A-Za-z0-9][\w-]*)*)\s*$/;

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

const REQUIRED_USAGE_PREFIX = 'Use ';

function locationOf(entry: { readonly filePath: string; readonly lineNumber: number }): string {
  return `${entry.filePath}:${entry.lineNumber}`;
}

export const ANNOTATION_SEARCH_RADIUS_LINES = 5;

const MINIMUM_LINES_BETWEEN_BLUEPRINTS = ANNOTATION_SEARCH_RADIUS_LINES * 2 + 1;

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
