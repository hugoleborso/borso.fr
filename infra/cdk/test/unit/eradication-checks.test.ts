import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const CONSTRUCTS_DIR = path.resolve(HERE, '../../src/constructs');
const INTERNAL_DIR = path.resolve(HERE, '../../src/internal');
const SHARED_LIB_DIR = path.resolve(HERE, '../../../shared/lib');

function readStripped(filePath: string): string {
  const source = fs.readFileSync(filePath, 'utf-8');
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

/**
 * @Blueprint test-source-invariant
 * @BlueprintName Source Invariant Test
 * @BlueprintUsage Use for a dantotsu eradication whose rule is a shape that must never reappear in a file, where no type or lint rule can express it.
 * @BlueprintDescription Reads the source files off disk, strips block and line comments, and asserts the banned shape is absent from what remains. Stripping first is what lets the same file carry a comment explaining the trap without the explanation tripping the check. The file list is read from the directory rather than hard coded and driven through `it.each`, so a construct added later is covered without anyone remembering to add it, and each describe names the dantotsu it backstops.
 */
describe('eradication: no `bundling.nodeModules` in CDK constructs', () => {
  const files = fs.readdirSync(CONSTRUCTS_DIR).filter((name) => name.endsWith('.ts'));
  it.each(files)('%s', (file) => {
    const stripped = readStripped(path.join(CONSTRUCTS_DIR, file));
    expect(stripped).not.toMatch(/\bnodeModules\s*:/);
  });
});

// @FollowsBlueprint test-artifact-audit
describe('eradication: every app `destroy` script chains the same builds as `deploy`', () => {
  const APPS_DIR = path.resolve(HERE, '../../../../apps');
  const appNames = fs.existsSync(APPS_DIR)
    ? fs.readdirSync(APPS_DIR).filter((entry) => {
        const pkgJsonPath = path.join(APPS_DIR, entry, 'package.json');
        return fs.existsSync(pkgJsonPath);
      })
    : [];

  it.each(appNames)('%s/package.json: destroy chains the build', (appName) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(APPS_DIR, appName, 'package.json'), 'utf-8'));
    const destroy: string = pkg.scripts?.destroy ?? '';
    expect(destroy).toContain('pnpm --filter @borso/infra run build');
    expect(destroy).toContain('pnpm build');
    expect(destroy).toContain('cdk destroy');
  });
});

// @FollowsBlueprint test-source-invariant
describe('eradication: no RemovalPolicy.RETAIN on static-site buckets', () => {
  const sourcePath = path.join(CONSTRUCTS_DIR, 'static-site.ts');
  const stripped = readStripped(sourcePath);

  it('does not reference RemovalPolicy.RETAIN', () => {
    expect(stripped).not.toMatch(/RemovalPolicy\.RETAIN/);
  });
});

// @FollowsBlueprint test-source-invariant
describe('eradication: shared SSM parameter names live in one module', () => {
  const SHARED_SSM_PREFIX = '/borso/shared/';
  const OWNING_MODULE = path.join(INTERNAL_DIR, 'shared-ssm.ts');
  const scannedFiles = [CONSTRUCTS_DIR, INTERNAL_DIR, SHARED_LIB_DIR]
    .flatMap((dir) =>
      fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.ts'))
        .map((name) => path.join(dir, name)),
    )
    .filter((file) => file !== OWNING_MODULE)
    .map((file) => path.relative(REPO_ROOT, file));

  it.each(scannedFiles)('%s', (file) => {
    expect(readStripped(path.join(REPO_ROOT, file))).not.toContain(SHARED_SSM_PREFIX);
  });
});

// @FollowsBlueprint test-source-invariant
describe('eradication: cf-host-routing-function uses ES5-only syntax', () => {
  const sourcePath = path.join(INTERNAL_DIR, 'cf-host-routing-function.code.js');
  const stripped = readStripped(sourcePath);

  it('uses var, not let or const, for variable declarations', () => {
    expect(stripped).not.toMatch(/\b(let|const)\s+\w+\s*=/);
  });

  it('does not use optional chaining (`?.`)', () => {
    expect(stripped).not.toMatch(/\?\./);
  });

  it('does not use template literals', () => {
    expect(stripped).not.toMatch(/`[^`]*\$\{/);
  });
});

// @FollowsBlueprint test-artifact-audit
describe('eradication: the edge function knows every app that gets SPA routing', () => {
  const APPS_DIR = path.resolve(REPO_ROOT, 'apps');
  const EDGE_FUNCTION = path.join(INTERNAL_DIR, 'cf-host-routing-function.code.js');

  function appsComposingPreviewableApp(): string[] {
    return fs
      .readdirSync(APPS_DIR)
      .filter((appName) => {
        const stackPath = path.join(APPS_DIR, appName, 'cdk/lib/stack.ts');
        return fs.existsSync(stackPath) && readStripped(stackPath).includes('new PreviewableApp');
      })
      .sort();
  }

  function singlePageAppsInEdgeFunction(): string[] {
    const listed = /var SINGLE_PAGE_APPS = \[([^\]]*)\]/.exec(readStripped(EDGE_FUNCTION));
    expect(listed).not.toBeNull();
    return [...(listed?.[1] ?? '').matchAll(/'([^']+)'/g)].map((entry) => entry[1] ?? '').sort();
  }

  it('lists exactly the apps whose stack composes PreviewableApp, which sets spaFallback', () => {
    expect(singlePageAppsInEdgeFunction()).toEqual(appsComposingPreviewableApp());
  });
});

function withoutAnnotations(relativePath: string): string {
  return fs
    .readFileSync(path.resolve(REPO_ROOT, relativePath), 'utf-8')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
    .trim();
}

// @FollowsBlueprint test-artifact-audit
describe('eradication: the two copies of haversine.utils.ts agree', () => {
  const COPIES = [
    'apps/last-loop-lepin/api/src/helpers/geo/haversine.utils.ts',
    'apps/last-loop-lepin/site/src/lib/haversine.utils.ts',
  ];

  it('compute distance from the same source, which no import path enforces', () => {
    const [apiCopy, siteCopy] = COPIES.map(withoutAnnotations);
    expect(siteCopy).toBe(apiCopy);
  });
});
