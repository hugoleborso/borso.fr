import { describe, expect, it } from 'vitest';
import {
  collectClosure,
  digestDependencies,
  listChangedImporters,
  parseLockfile,
  pickRootManifestFields,
  readEntry,
  resolveSnapshotKey,
  stripCatalogs,
  type DependencyInputs,
} from './dependency-closure.core';

const LOCKFILE = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true

catalogs:
  default:
    react:
      specifier: ^19.0.0
      version: 19.2.8

importers:

  .:
    devDependencies:
      eslint:
        specifier: 10.11.0
        version: 10.11.0

  apps/site:
    dependencies:
      '@borso/infra':
        specifier: workspace:*
        version: link:../../infra/cdk
      react:
        specifier: 'catalog:'
        version: 19.2.8
    devDependenciesMeta:
      ignored:
        version: 1.0.0
    devDependencies:
      vite:
        specifier: ^7.0.0
        version: 7.1.0(@types/node@22.19.17)

  apps/other:
    optionalDependencies:
      left-pad:
        version: 1.3.0
        specifier: ^1.0.0

  infra/cdk:
    dependencies:
      esbuild:
        specifier: 0.28.2
        version: 0.28.2

packages:

  react@19.2.8:
    resolution: {integrity: sha512-a}

snapshots:

  eslint@10.11.0: {}

  esbuild@0.28.2:
    optionalDependencies:
      '@esbuild/linux-x64': 0.28.2

  '@esbuild/linux-x64@0.28.2': {}

  left-pad@1.3.0: {}

  react@19.2.8: {}

  vite@7.1.0(@types/node@22.19.17):
    dependencies:
      rollup: 4.0.0
      string-width-cjs: string-width@4.2.3
    transitivePeerDependencies:
      - supports-color

  rollup@4.0.0:
    dependencies:
      vite: 7.1.0(@types/node@22.19.17)

  string-width@4.2.3:
    bundledMeta:
      ignored: 1.0.0
`;

function buildInputs(lockfileText: string): DependencyInputs {
  return {
    lockfile: parseLockfile(lockfileText),
    workspaceSettings: 'packages:\n  - apps/*\n',
    rootManifestFields: '{}',
  };
}

describe('readEntry', () => {
  it('reads a quoted key and unquotes its value', () => {
    expect(readEntry("      'it''s': 'catalog:'")).toEqual({
      depth: 3,
      key: "it's",
      value: 'catalog:',
    });
  });

  it('reads a plain key with a value', () => {
    expect(readEntry('    rollup: 4.0.0')).toEqual({ depth: 2, key: 'rollup', value: '4.0.0' });
  });

  it('reads a plain key that opens a block', () => {
    expect(readEntry('  apps/site:')).toEqual({ depth: 1, key: 'apps/site', value: '' });
  });

  it('reads a quoted key that opens a block', () => {
    expect(readEntry("  '@a/b@1.0.0':")).toEqual({ depth: 1, key: '@a/b@1.0.0', value: '' });
  });

  it('keeps a lone quote as it is', () => {
    expect(readEntry("    key: '")?.value).toBe("'");
  });

  it('keeps a value that only closes with a quote', () => {
    expect(readEntry("    key: open'")?.value).toBe("open'");
  });

  it('reads an empty quoted value as empty', () => {
    expect(readEntry("    key: ''")?.value).toBe('');
  });

  it('keeps a value that only opens with a quote', () => {
    expect(readEntry("    key: 'open")?.value).toBe("'open");
  });

  it('skips blank lines and list items', () => {
    expect(readEntry('   ')).toBeNull();
    expect(readEntry('      - supports-color')).toBeNull();
  });
});

describe('resolveSnapshotKey', () => {
  it('prefixes a version with its package name', () => {
    expect(resolveSnapshotKey('vite', '7.1.0(@types/node@22.19.17)')).toBe(
      'vite@7.1.0(@types/node@22.19.17)',
    );
  });

  it('takes an aliased version as the key itself', () => {
    expect(resolveSnapshotKey('string-width-cjs', 'string-width@4.2.3')).toBe('string-width@4.2.3');
  });
});

describe('parseLockfile', () => {
  const lockfile = parseLockfile(LOCKFILE);

  it('keeps the sections that are not the graph as settings', () => {
    expect(lockfile.settings).toBe(
      "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n",
    );
  });

  it('reads the resolved version of every dependency field of an importer', () => {
    expect(Object.fromEntries(lockfile.importers.get('apps/site') ?? [])).toEqual({
      '@borso/infra': 'link:../../infra/cdk',
      react: '19.2.8',
      vite: '7.1.0(@types/node@22.19.17)',
    });
    expect(Object.fromEntries(lockfile.importers.get('apps/other') ?? [])).toEqual({
      'left-pad': '1.3.0',
    });
  });

  it('reads the dependencies of a snapshot and leaves out its peer list', () => {
    expect(
      Object.fromEntries(lockfile.snapshots.get('vite@7.1.0(@types/node@22.19.17)') ?? []),
    ).toEqual({ rollup: '4.0.0', 'string-width-cjs': 'string-width@4.2.3' });
    expect(Object.fromEntries(lockfile.snapshots.get('esbuild@0.28.2') ?? [])).toEqual({
      '@esbuild/linux-x64': '0.28.2',
    });
  });

  it('leaves out a snapshot field that holds no dependencies', () => {
    expect(lockfile.snapshots.get('string-width@4.2.3')?.size).toBe(0);
  });

  it('keeps what comes before the first section in the settings', () => {
    expect(parseLockfile('\nsnapshots:\n\n  a@1.0.0: {}\n').settings).toBe('');
  });

  it('reads a lockfile with no graph as empty', () => {
    const empty = parseLockfile("lockfileVersion: '9.0'\n");
    expect(empty.importers.size).toBe(0);
    expect(empty.snapshots.size).toBe(0);
  });
});

describe('collectClosure', () => {
  const lockfile = parseLockfile(LOCKFILE);

  it('follows links into other importers and walks the snapshot graph once', () => {
    expect(collectClosure(lockfile, 'apps/site')).toEqual([
      '@esbuild/linux-x64@0.28.2',
      'esbuild@0.28.2',
      'importer:apps/site',
      'importer:infra/cdk',
      'react@19.2.8',
      'rollup@4.0.0',
      'string-width@4.2.3',
      'vite@7.1.0(@types/node@22.19.17)',
    ]);
  });

  it('keeps a version whose snapshot is missing and an importer that is not there', () => {
    expect(collectClosure(lockfile, 'apps/missing')).toEqual(['importer:apps/missing']);
    const orphan = parseLockfile(
      'importers:\n\n  apps/x:\n    dependencies:\n      a:\n        version: 1.0.0\n',
    );
    expect(collectClosure(orphan, 'apps/x')).toEqual(['a@1.0.0', 'importer:apps/x']);
  });
});

describe('stripCatalogs', () => {
  it('keeps what comes before the first section', () => {
    expect(stripCatalogs('\ncatalog:\n  react: ^19.0.0\n')).toBe('');
    expect(stripCatalogs('\npackages:\n')).toBe('\npackages:\n');
  });

  it('drops both catalog sections and keeps the rest', () => {
    expect(
      stripCatalogs(
        'packages:\n  - apps/*\ncatalog:\n  react: ^19.0.0\ncatalogs:\n  zod3:\n    zod: ^3.0.0\nonlyBuiltDependencies:\n  - esbuild\n',
      ),
    ).toBe('packages:\n  - apps/*\nonlyBuiltDependencies:\n  - esbuild\n');
  });
});

describe('pickRootManifestFields', () => {
  it('keeps only the fields that decide how dependencies install', () => {
    expect(
      pickRootManifestFields({
        name: 'root',
        scripts: { test: 'vitest' },
        packageManager: 'pnpm@10.0.0',
        pnpm: { onlyBuiltDependencies: ['esbuild'] },
        engines: { node: '>=22' },
      }),
    ).toBe(
      '{"packageManager":"pnpm@10.0.0","pnpm":{"onlyBuiltDependencies":["esbuild"]},"engines":{"node":">=22"}}',
    );
  });

  it('reads a manifest that is not an object as empty', () => {
    expect(pickRootManifestFields(null)).toBe('{}');
    expect(pickRootManifestFields('text')).toBe('{}');
  });
});

describe('digestDependencies', () => {
  it('gives the same digest for the same inputs', () => {
    expect(digestDependencies(buildInputs(LOCKFILE), 'apps/site')).toMatch(/^[0-9a-f]{64}$/);
    expect(digestDependencies(buildInputs(LOCKFILE), 'apps/site')).toBe(
      digestDependencies(buildInputs(LOCKFILE), 'apps/site'),
    );
  });

  it('separates its parts, so moving text between them changes the digest', () => {
    const first = { ...buildInputs(LOCKFILE), workspaceSettings: 'ab', rootManifestFields: 'c' };
    const second = { ...buildInputs(LOCKFILE), workspaceSettings: 'a', rootManifestFields: 'bc' };
    expect(digestDependencies(first, 'apps/site')).not.toBe(
      digestDependencies(second, 'apps/site'),
    );
  });
});

describe('listChangedImporters', () => {
  const apps = ['apps/site', 'apps/other'];
  const before = buildInputs(LOCKFILE);

  it('names only the importer whose resolved graph moved', () => {
    const after = buildInputs(
      LOCKFILE.replace(
        'left-pad@1.3.0: {}',
        'left-pad@1.3.0:\n    dependencies:\n      tiny: 1.0.0',
      ),
    );
    expect(listChangedImporters(before, after, apps)).toEqual(['apps/other']);
  });

  it('ignores a specifier that resolves to the same version', () => {
    const after = buildInputs(LOCKFILE.replace('specifier: ^7.0.0', "specifier: 'catalog:'"));
    expect(listChangedImporters(before, after, apps)).toEqual([]);
  });

  it('names an importer whose linked workspace package moved', () => {
    const after = buildInputs(
      LOCKFILE.replace("'@esbuild/linux-x64': 0.28.2", "'@esbuild/linux-x64': 0.28.3"),
    );
    expect(listChangedImporters(before, after, apps)).toEqual(['apps/site']);
  });

  it('names every importer when the root importer moves', () => {
    const after = buildInputs(LOCKFILE.replace('version: 10.11.0', 'version: 10.12.0'));
    expect(listChangedImporters(before, after, apps)).toEqual(apps);
  });

  it('names every importer when the lockfile settings move', () => {
    const after = buildInputs(
      LOCKFILE.replace('autoInstallPeers: true', 'autoInstallPeers: false'),
    );
    expect(listChangedImporters(before, after, apps)).toEqual(apps);
  });

  it('names every importer when the workspace settings or root manifest move', () => {
    expect(
      listChangedImporters(before, { ...before, workspaceSettings: 'overrides: {}' }, apps),
    ).toEqual(apps);
    expect(
      listChangedImporters(before, { ...before, rootManifestFields: '{"pnpm":{}}' }, apps),
    ).toEqual(apps);
  });
});
