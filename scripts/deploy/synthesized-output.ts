import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  digestSynthesizedOutput,
  listAppsWhoseDigestDiffers,
  type OutputDigest,
} from './synthesized-output.core';

const SYNTH_OUTPUT_DIRECTORY = 'cdk.out';
const PLACEHOLDER_ACCOUNT = '000000000000';
const DEFAULT_REGION = 'eu-west-3';
const DEFAULT_STAGE = 'prod';

function synthesisEnvironment(): NodeJS.ProcessEnv {
  const { GITHUB_SHA: _release, SENTRY_AUTH_TOKEN: _uploadToken, ...inherited } = process.env;
  return {
    ...inherited,
    STAGE: inherited['STAGE'] ?? DEFAULT_STAGE,
    CDK_DEFAULT_ACCOUNT: inherited['CDK_DEFAULT_ACCOUNT'] ?? PLACEHOLDER_ACCOUNT,
    AWS_REGION: inherited['AWS_REGION'] ?? DEFAULT_REGION,
  };
}

function didSucceed(command: string, args: readonly string[], directory: string): boolean {
  const result = spawnSync(command, args, {
    cwd: directory,
    env: synthesisEnvironment(),
    stdio: ['ignore', process.stderr, process.stderr],
  });
  return result.status === 0;
}

function digestApp(root: string, app: string): OutputDigest {
  const appDirectory = join(root, 'apps', app);
  if (!existsSync(appDirectory)) return null;
  const outputDirectory = join(appDirectory, SYNTH_OUTPUT_DIRECTORY);
  rmSync(outputDirectory, { recursive: true, force: true });
  if (!didSucceed('pnpm', ['run', 'synth'], appDirectory)) return null;
  const files = readdirSync(outputDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      name: entry.name,
      content: readFileSync(join(outputDirectory, entry.name), 'utf8'),
    }));
  return digestSynthesizedOutput(files);
}

function digestApps(root: string | null, apps: readonly string[]): Map<string, OutputDigest> {
  return new Map(apps.map((app) => [app, root === null ? null : digestApp(root, app)]));
}

function extractRevision(revision: string, scratch: string, label: string): string | null {
  const archive = join(scratch, `${label}.tar`);
  const root = join(scratch, label);
  mkdirSync(root, { recursive: true });
  const isExtracted =
    didSucceed('git', ['archive', '--format=tar', '-o', archive, revision], process.cwd()) &&
    didSucceed('tar', ['-xf', archive, '-C', root], scratch) &&
    didSucceed('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], root);
  return isExtracted ? root : null;
}

export function listAppsWhoseOutputChanged(
  base: string,
  headOrThisCheckout: string | null,
  apps: readonly string[],
): string[] {
  const scratch = mkdtempSync(join(tmpdir(), 'synthesized-output-'));
  try {
    const headRoot =
      headOrThisCheckout === null
        ? process.cwd()
        : extractRevision(headOrThisCheckout, scratch, 'head');
    const headDigests = digestApps(headRoot, apps);
    const baseDigests = digestApps(extractRevision(base, scratch, 'base'), apps);
    for (const app of apps) {
      process.stderr.write(
        `[synthesized-output] ${app}: base ${baseDigests.get(app)} head ${headDigests.get(app)}\n`,
      );
    }
    return listAppsWhoseDigestDiffers(apps, baseDigests, headDigests);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
