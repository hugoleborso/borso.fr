import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Shared Stryker settings.
 *
 * Stryker has no `extends` key in its JSON configuration, so each workspace
 * ships a `stryker.config.js` that imports this function and passes only its
 * own mutate globs.
 *
 * See docs/standards/10-testing.md.
 */

/** A mutant that hangs is a mutated loop condition, and it is killed by the clock. */
const MUTANT_TIMEOUT_MILLISECONDS = 8000;

/**
 * Where Stryker copies the workspace to mutate it, outside the workspace.
 *
 * The default is `.stryker-tmp` beside the code, and a sandbox appearing and
 * vanishing inside a workspace is visible to anything else reading that
 * directory. It has bitten this repository twice: the architecture generator
 * counted the sandbox's files as real ones, and `infra/cdk`'s CDK snapshot
 * tests fail with an ENOENT inside `AssetStaging.calculateHash` when a
 * concurrent mutation run creates one mid-walk, which the pre-push wave does
 * every time a change touches both a pure module and anything else in the
 * workspace.
 *
 * Keyed by the workspace path so the parallel gates cannot collide.
 */
function sandboxOutsideTheWorkspace() {
  const slug = process
    .cwd()
    .replaceAll(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');
  return join(tmpdir(), `borso-stryker-${slug}`);
}

export function defineStrykerConfig({ mutate, vitest }) {
  return {
    packageManager: 'pnpm',
    testRunner: 'vitest',
    // Stryker finds plugins by globbing `node_modules/@stryker-mutator/*` from
    // its own install location, and pnpm's isolated store puts the runner
    // behind a symlink that the glob does not follow. Naming the plugin makes
    // Stryker `import()` it instead, which pnpm resolves.
    plugins: ['@stryker-mutator/vitest-runner'],
    reporters: ['progress-append-only', 'clear-text'],
    coverageAnalysis: 'perTest',
    timeoutMS: MUTANT_TIMEOUT_MILLISECONDS,
    concurrency: 4,
    tempDirName: sandboxOutsideTheWorkspace(),
    cleanTempDir: true,
    disableTypeChecks: '{src,site,api,test}/**/*.{js,ts,jsx,tsx}',
    // A mutation in code that runs once at module load, e.g. a constant table,
    // is reported separately and does not fail the gate on its own.
    ignoreStatic: true,
    mutate,
    ...(vitest === undefined ? {} : { vitest }),
    // Zero survivors, which is what docs/standards/10-testing.md requires. A
    // surviving mutant is a change to the code that no test noticed.
    thresholds: { high: 100, low: 100, break: 100 },
  };
}
