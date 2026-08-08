/**
 * Shared utilities for the blueprint scripts.
 *
 * Project and layer are inferred from the file path, and the layer names match
 * the Layer Reference table that `blueprint-indexing.ts` writes into
 * `blueprint-index.md`.
 *
 * Adapted from the `blueprint` skill in pernod-ricard-rgm/pr-aquila-ap-v2. The
 * inference here follows this repository's layout, which is `apps/<slug>/api`
 * and `apps/<slug>/site` per application, plus the shared CDK packages under
 * `infra/`.
 */

export type BlueprintProject = 'api' | 'site' | 'infra';

const API_PATH_SEGMENT = '/api/src/';

export function inferProject(filePath: string): BlueprintProject {
  if (filePath.startsWith('infra/')) {
    return 'infra';
  }
  if (filePath.includes(API_PATH_SEGMENT)) {
    return 'api';
  }
  return 'site';
}

/** The application slug, e.g. `pragma`, or `infra` for the shared packages. */
export function inferApplication(filePath: string): string {
  const match = /^apps\/([^/]+)\//.exec(filePath);
  if (match !== null) {
    return match[1];
  }
  const infraMatch = /^infra\/([^/]+)\//.exec(filePath);
  return infraMatch === null ? 'unknown' : `infra-${infraMatch[1]}`;
}

const LAYER_BY_FILE_SUFFIX: readonly (readonly [string, string])[] = [
  ['.controller.ts', 'controller'],
  ['.service.ts', 'service'],
  ['.repository.ts', 'repository'],
  ['.middleware.ts', 'middleware'],
  ['.schema.ts', 'schema'],
  ['.core.ts', 'core'],
  ['.utils.ts', 'utils'],
  ['.types.ts', 'types'],
  ['.environment.ts', 'environment'],
];

const LAYER_BY_PATH_SEGMENT: readonly (readonly [string, string])[] = [
  ['/components/atoms/', 'atom'],
  ['/components/molecules/', 'molecule'],
  ['/components/organisms/', 'organism'],
  ['/routes/', 'route'],
  ['/lib/queries/', 'query'],
  ['/i18n/', 'i18n'],
  ['/database/', 'database'],
  ['/constructs/', 'construct'],
];

export function inferLayer(filePath: string): string {
  for (const [segment, layer] of LAYER_BY_PATH_SEGMENT) {
    if (filePath.includes(segment)) {
      return layer;
    }
  }
  for (const [suffix, layer] of LAYER_BY_FILE_SUFFIX) {
    if (filePath.endsWith(suffix)) {
      return layer;
    }
  }
  return 'unknown';
}

export interface FollowsBlueprintEntry {
  readonly blueprintId: string;
  readonly lineNumber: number;
}

const FOLLOWS_BLUEPRINT_PATTERN = /\/\/\s*@FollowsBlueprint\s+(.+)/;

/**
 * Parse `// @FollowsBlueprint id` comments out of a file, returning one entry
 * per identifier with the line it sits on.
 */
export function extractFollowsBlueprint(fileContent: string): FollowsBlueprintEntry[] {
  const entries: FollowsBlueprintEntry[] = [];
  const lines = fileContent.split('\n');
  for (const [index, line] of lines.entries()) {
    const match = FOLLOWS_BLUEPRINT_PATTERN.exec(line);
    if (match === null) {
      continue;
    }
    for (const blueprintId of match[1].trim().split(/\s+/)) {
      if (blueprintId !== '') {
        entries.push({ blueprintId, lineNumber: index + 1 });
      }
    }
  }
  return entries;
}
