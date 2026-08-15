/**
 * Decides whether every workspace agrees on the version of every dependency it
 * shares with another workspace.
 *
 * The decision is about `pnpm-workspace.yaml`'s catalogs rather than about the
 * ranges themselves. Comparing ranges finds a disagreement after it happens;
 * requiring a shared name to resolve through the catalog means the second
 * workspace has no range of its own to disagree with.
 */

const CATALOG_PREFIX = 'catalog:';
const DEFAULT_CATALOG = 'default';
const WORKSPACE_PREFIX = 'workspace:';

export interface Declaration {
  readonly name: string;
  readonly range: string;
}

export interface WorkspaceManifest {
  readonly workspace: string;
  readonly declarations: readonly Declaration[];
}

/** Every catalog by name, with `default` holding the unnamed `catalog:` block. */
export type Catalogs = ReadonlyMap<string, ReadonlyMap<string, string>>;

export interface CatalogProblem {
  readonly workspace: string;
  readonly message: string;
}

/**
 * The catalog a range points at, or `null` when the range is a version of its
 * own. `catalog:` is the default catalog and `catalog:react19` is a named one.
 */
export function readCatalogReference(range: string): string | null {
  if (!range.startsWith(CATALOG_PREFIX)) return null;
  const named = range.slice(CATALOG_PREFIX.length).trim();
  return named.length === 0 ? DEFAULT_CATALOG : named;
}

function isLocal(range: string): boolean {
  return range.startsWith(WORKSPACE_PREFIX);
}

function countWorkspacesByDependency(
  manifests: readonly WorkspaceManifest[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const manifest of manifests) {
    for (const declaration of manifest.declarations) {
      if (isLocal(declaration.range)) continue;
      counts.set(declaration.name, (counts.get(declaration.name) ?? 0) + 1);
    }
  }
  return counts;
}

function findUncatalogued(
  manifests: readonly WorkspaceManifest[],
  sharedNames: ReadonlySet<string>,
): readonly CatalogProblem[] {
  const problems: CatalogProblem[] = [];
  for (const manifest of manifests) {
    for (const { name, range } of manifest.declarations) {
      if (isLocal(range)) continue;
      if (!sharedNames.has(name)) continue;
      if (readCatalogReference(range) !== null) continue;
      problems.push({
        workspace: manifest.workspace,
        message: `\`${name}\` is declared as \`${range}\` and another workspace declares it too, so it belongs in a catalog`,
      });
    }
  }
  return problems;
}

function findDanglingReferences(
  manifests: readonly WorkspaceManifest[],
  catalogs: Catalogs,
): readonly CatalogProblem[] {
  const problems: CatalogProblem[] = [];
  for (const manifest of manifests) {
    for (const { name, range } of manifest.declarations) {
      const catalog = readCatalogReference(range);
      if (catalog === null) continue;
      if (catalogs.get(catalog)?.has(name) === true) continue;
      problems.push({
        workspace: manifest.workspace,
        message: `\`${name}\` points at the ${catalog} catalog, which has no entry for it`,
      });
    }
  }
  return problems;
}

function findUnusedEntries(
  manifests: readonly WorkspaceManifest[],
  catalogs: Catalogs,
): readonly CatalogProblem[] {
  const declarations = manifests.flatMap((manifest) => manifest.declarations);
  const isRead = (catalog: string, name: string): boolean =>
    declarations.some(
      (declaration) =>
        declaration.name === name && readCatalogReference(declaration.range) === catalog,
    );

  const problems: CatalogProblem[] = [];
  for (const [catalog, entries] of catalogs) {
    for (const name of entries.keys()) {
      if (isRead(catalog, name)) continue;
      problems.push({
        workspace: 'pnpm-workspace.yaml',
        message: `the ${catalog} catalog holds \`${name}\` and no workspace reads it`,
      });
    }
  }
  return problems;
}

/**
 * Every reason the catalogs and the manifests disagree, in the order a reader
 * should act on them: name a version twice, point at nothing, hold nothing.
 */
export function listCatalogProblems(
  manifests: readonly WorkspaceManifest[],
  catalogs: Catalogs,
): readonly CatalogProblem[] {
  const counts = countWorkspacesByDependency(manifests);
  const sharedNames = new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  return [
    ...findUncatalogued(manifests, sharedNames),
    ...findDanglingReferences(manifests, catalogs),
    ...findUnusedEntries(manifests, catalogs),
  ];
}
