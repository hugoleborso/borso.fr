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
