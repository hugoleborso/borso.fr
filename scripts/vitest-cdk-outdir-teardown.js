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
 * The teardown removes the directories this run created, identified by
 * differencing the temp folder rather than by age, so a suite running
 * concurrently keeps its own.
 *
 * Plain JavaScript, like the repository's other root-level tooling, because no
 * `tsconfig.json` covers `scripts/`.
 *
 * @returns the teardown vitest calls once every suite in the project has run.
 */

import { readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CDK_OUTDIR_PREFIX = 'cdk.out';

async function listAssemblyDirectories() {
  const entries = await readdir(tmpdir());
  return new Set(entries.filter((entry) => entry.startsWith(CDK_OUTDIR_PREFIX)));
}

export async function setup() {
  const before = await listAssemblyDirectories();

  return async function teardown() {
    const after = await listAssemblyDirectories();
    const created = [...after].filter((entry) => !before.has(entry));
    await Promise.all(
      created.map((entry) => rm(join(tmpdir(), entry), { recursive: true, force: true })),
    );
  };
}
