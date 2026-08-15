import { describe, expect, it } from 'vitest';
import {
  listCatalogProblems,
  readCatalogReference,
  type Catalogs,
  type WorkspaceManifest,
} from './catalog.core';

function buildCatalogs(entries: Record<string, Record<string, string>>): Catalogs {
  return new Map(
    Object.entries(entries).map(([catalog, versions]) => [
      catalog,
      new Map(Object.entries(versions)),
    ]),
  );
}

function buildManifest(workspace: string, declarations: Record<string, string>): WorkspaceManifest {
  return {
    workspace,
    declarations: Object.entries(declarations).map(([name, range]) => ({ name, range })),
  };
}

describe('readCatalogReference', () => {
  it('reads a bare marker as the default catalog', () => {
    expect(readCatalogReference('catalog:')).toBe('default');
  });

  it('reads a named catalog', () => {
    expect(readCatalogReference('catalog:zod3')).toBe('zod3');
  });

  it('reads a named catalog padded with spaces', () => {
    expect(readCatalogReference('catalog: zod3 ')).toBe('zod3');
  });

  it('reads a marker holding only spaces as the default catalog', () => {
    expect(readCatalogReference('catalog:   ')).toBe('default');
  });

  it('reads a version range as no reference', () => {
    expect(readCatalogReference('^4.1.10')).toBeNull();
  });

  /** The marker has to open the range; a version that merely contains it is one. */
  it('reads a range that mentions the marker later as no reference', () => {
    expect(readCatalogReference('npm:catalog:x')).toBeNull();
  });
});

describe('listCatalogProblems', () => {
  const catalogs = buildCatalogs({ default: { vitest: '^4.1.10' } });

  it('finds nothing wrong when both workspaces read the catalog', () => {
    const manifests = [
      buildManifest('apps/pragma', { vitest: 'catalog:' }),
      buildManifest('infra/cdk', { vitest: 'catalog:' }),
    ];
    expect(listCatalogProblems(manifests, catalogs)).toEqual([]);
  });

  it('leaves a dependency only one workspace declares alone', () => {
    const manifests = [
      buildManifest('apps/pragma', { vitest: 'catalog:', leaflet: '^1.9.4' }),
      buildManifest('infra/cdk', { vitest: 'catalog:' }),
    ];
    expect(listCatalogProblems(manifests, catalogs)).toEqual([]);
  });

  it('names the workspace that keeps a range for a shared dependency', () => {
    const manifests = [
      buildManifest('apps/pragma', { vitest: 'catalog:' }),
      buildManifest('infra/cdk', { vitest: '^4.1.10' }),
    ];
    expect(listCatalogProblems(manifests, catalogs)).toEqual([
      {
        workspace: 'infra/cdk',
        message:
          '`vitest` is declared as `^4.1.10` and another workspace declares it too, so it belongs in a catalog',
      },
    ]);
  });

  /** Two agreeing ranges are still two ranges, and the second one can move. */
  it('reports both workspaces when neither reads the catalog', () => {
    const manifests = [
      buildManifest('apps/pragma', { vitest: '^4.1.10' }),
      buildManifest('infra/cdk', { vitest: '^4.1.10' }),
    ];
    expect(listCatalogProblems(manifests, catalogs).map((problem) => problem.workspace)).toEqual([
      'apps/pragma',
      'infra/cdk',
      'pnpm-workspace.yaml',
    ]);
  });

  /**
   * The local package and the published one share a name and nothing else, so
   * the workspace holding the published range has nobody to disagree with.
   */
  it('does not let a workspace protocol range make another workspace shared', () => {
    const manifests = [
      buildManifest('apps/pragma', { leaflet: 'workspace:*' }),
      buildManifest('infra/cdk', { leaflet: '^1.9.4' }),
    ];
    expect(findCatalogProblems(manifests, buildCatalogs({ default: {} }))).toEqual([]);
  });

  /** The catalog is for ranges, and a workspace protocol range is not one. */
  it('does not ask a workspace protocol range to read the catalog', () => {
    const manifests = [
      buildManifest('apps/pragma', { vitest: 'catalog:' }),
      buildManifest('infra/cdk', { vitest: 'catalog:' }),
      buildManifest('infra/shared', { vitest: 'workspace:*' }),
    ];
    expect(findCatalogProblems(manifests, catalogs)).toEqual([]);
  });

  /** A workspace dependency is the same package, not a shared external one. */
  it('does not count a workspace protocol range towards sharing', () => {
    const manifests = [
      buildManifest('apps/pragma', { '@borso/infra': 'workspace:*' }),
      buildManifest('infra/shared', { '@borso/infra': 'workspace:*' }),
    ];
    expect(listCatalogProblems(manifests, buildCatalogs({ default: {} }))).toEqual([]);
  });

  it('reports a reference to a catalog that has no entry for the dependency', () => {
    const manifests = [
      buildManifest('apps/pragma', { zod: 'catalog:' }),
      buildManifest('infra/cdk', { zod: 'catalog:' }),
    ];
    expect(listCatalogProblems(manifests, catalogs).map((problem) => problem.message)).toEqual([
      '`zod` points at the default catalog, which has no entry for it',
      '`zod` points at the default catalog, which has no entry for it',
      'the default catalog holds `vitest` and no workspace reads it',
    ]);
  });

  it('reports a reference to a named catalog that does not exist at all', () => {
    const manifests = [buildManifest('apps/pragma', { zod: 'catalog:zod9' })];
    const problems = listCatalogProblems(manifests, buildCatalogs({ zod3: { zod: '^3.24.0' } }));
    expect(problems[0]).toEqual({
      workspace: 'apps/pragma',
      message: '`zod` points at the zod9 catalog, which has no entry for it',
    });
  });

  it('reads two named catalogs holding the same dependency as separate answers', () => {
    const manifests = [
      buildManifest('apps/pragma', { zod: 'catalog:zod3' }),
      buildManifest('.', { zod: 'catalog:zod4' }),
    ];
    const twoCatalogs = buildCatalogs({ zod3: { zod: '^3.24.0' }, zod4: { zod: '^4.4.3' } });
    expect(listCatalogProblems(manifests, twoCatalogs)).toEqual([]);
  });

  it('reports a catalog entry nothing reads', () => {
    const manifests = [buildManifest('apps/pragma', { vitest: 'catalog:' })];
    const withDeadEntry = buildCatalogs({ default: { vitest: '^4.1.10', tsx: '^4.19.2' } });
    expect(listCatalogProblems(manifests, withDeadEntry)).toEqual([
      {
        workspace: 'pnpm-workspace.yaml',
        message: 'the default catalog holds `tsx` and no workspace reads it',
      },
    ]);
  });

  /** A name read from one catalog does not keep the same name alive in another. */
  it('reports an entry whose name is read from a different catalog', () => {
    const manifests = [buildManifest('apps/pragma', { zod: 'catalog:zod3' })];
    const twoCatalogs = buildCatalogs({ zod3: { zod: '^3.24.0' }, zod4: { zod: '^4.4.3' } });
    expect(listCatalogProblems(manifests, twoCatalogs)).toEqual([
      {
        workspace: 'pnpm-workspace.yaml',
        message: 'the zod4 catalog holds `zod` and no workspace reads it',
      },
    ]);
  });
});
