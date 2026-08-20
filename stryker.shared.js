import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MUTANT_TIMEOUT_MILLISECONDS = 8000;

const DRY_RUN_TIMEOUT_MINUTES_UNDER_THE_PARALLEL_PUSH_WAVE = 20;

const ZERO_SURVIVING_MUTANTS = { high: 100, low: 100, break: 100 };

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
    plugins: ['@stryker-mutator/vitest-runner'],
    reporters: ['progress-append-only', 'clear-text'],
    coverageAnalysis: 'perTest',
    timeoutMS: MUTANT_TIMEOUT_MILLISECONDS,
    dryRunTimeoutMinutes: DRY_RUN_TIMEOUT_MINUTES_UNDER_THE_PARALLEL_PUSH_WAVE,
    concurrency: 4,
    tempDirName: sandboxOutsideTheWorkspace(),
    cleanTempDir: true,
    disableTypeChecks: '{src,site,api,test}/**/*.{js,ts,jsx,tsx}',
    ignoreStatic: true,
    mutate,
    ...(vitest === undefined ? {} : { vitest }),
    thresholds: ZERO_SURVIVING_MUTANTS,
  };
}
