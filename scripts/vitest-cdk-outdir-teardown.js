import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RUN_TEMP_PREFIX = 'vitest-cdk-';
const ENSURE_INFRA_BUILT = resolve(import.meta.dirname, 'ensure-infra-built.sh');

export async function setup() {
  execFileSync(ENSURE_INFRA_BUILT, { stdio: 'inherit' });
  const runTempRoot = await mkdtemp(join(tmpdir(), RUN_TEMP_PREFIX));
  process.env.TMPDIR = runTempRoot;

  return async function teardown() {
    await rm(runTempRoot, { recursive: true, force: true });
  };
}
