/**
 * Vitest `globalSetup` for any workspace whose tests synthesize a CDK `App`.
 *
 * `new App()` without an `outdir` writes its cloud assembly to a fresh
 * `mkdtemp` directory under the system temp folder and never removes it. Asset
 * staging copies real files in — the awscli Lambda layer alone is 25 MB — so a
 * suite that synthesizes fifty stacks leaves fifty directories behind on every
 * run. On a sandbox with a fixed disk allowance this exhausts the disk in a few
 * hours, and the failure surfaces as `ENOSPC` inside an unrelated test.
 *
 * Each run gets its own temp root and deletes that, rather than differencing
 * the shared temp folder before and after. Differencing cannot survive
 * concurrency: it attributes every directory that appears during a run's
 * lifetime to that run, so when six gates run at once — which `.husky/pre-push`
 * now does — the first one to finish deletes the live cloud assemblies of the
 * ones still synthesizing, and they fail with `ENOENT` on a path they are in
 * the middle of writing. The previous version of this file claimed in its own
 * docstring that a concurrent suite would keep its own directories. It did not.
 *
 * Redirecting `TMPDIR` is what makes the isolation real: `os.tmpdir()` reads it
 * on every call, Vitest spawns its workers after `globalSetup` returns, and
 * they inherit the environment, so every `mkdtemp` in the run lands inside this
 * run's root.
 *
 * Plain JavaScript, like the repository's other root-level tooling, because no
 * `tsconfig.json` covers `scripts/`.
 *
 * @returns the teardown vitest calls once every suite in the project has run.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RUN_TEMP_PREFIX = 'vitest-cdk-';

export async function setup() {
  const runTempRoot = await mkdtemp(join(tmpdir(), RUN_TEMP_PREFIX));
  process.env.TMPDIR = runTempRoot;

  return async function teardown() {
    await rm(runTempRoot, { recursive: true, force: true });
  };
}
