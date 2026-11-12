import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const PREFLIGHT_SCRIPT = resolve(import.meta.dirname, 'preflight-preview-recovery.sh');
const STACK_LOG_GROUPS = [
  '/aws/lambda/pragma-pr-7-api',
  '/aws/lambda/pragma-pr-7-websocket',
  '/aws/lambda/pragma-pr-7-CustomCDKBucketDeployment-abc',
  'pragma-pr-7-AppDbMigrationRunnerLogsB6447066-abc',
  'pragma-pr-7-AppDbProviderLogsD76CF8C5-abc',
];
const LOG_GROUPS_OF_OTHER_STACKS = [
  '/aws/lambda/pragma-pr-70-api',
  'pragma-pr-70-AppDbProviderLogsD76CF8C5-abc',
  'pragma-prod-AppDbProviderLogsD76CF8C5-abc',
];

const FAKE_AWS = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_AWS_DIRECTORY/calls.log"
case "$1 $2" in
  "cloudformation describe-stacks")
    [ -n "$FAKE_STACK_STATUS" ] || exit 255
    printf '%s\\n' "$FAKE_STACK_STATUS" ;;
  "logs describe-log-groups")
    prefix=""
    while [ $# -gt 0 ]; do
      [ "$1" = "--log-group-name-prefix" ] && prefix="$2"
      shift
    done
    for log_group in $FAKE_LOG_GROUPS; do
      case "$log_group" in "$prefix"*) printf '%s\\t' "$log_group" ;; esac
    done
    printf '\\n' ;;
  "s3api head-bucket")
    exit 1 ;;
esac
`;

const directories: string[] = [];

function runPreflight(stackStatus: string): string[] {
  const directory = mkdtempSync(join(tmpdir(), 'preflight-'));
  directories.push(directory);
  writeFileSync(join(directory, 'aws'), FAKE_AWS);
  chmodSync(join(directory, 'aws'), 0o755);
  writeFileSync(join(directory, 'calls.log'), '');
  execFileSync(PREFLIGHT_SCRIPT, ['pragma', '7'], {
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH ?? ''}`,
      FAKE_AWS_DIRECTORY: directory,
      FAKE_STACK_STATUS: stackStatus,
      FAKE_LOG_GROUPS: [...STACK_LOG_GROUPS, ...LOG_GROUPS_OF_OTHER_STACKS].join(' '),
    },
    encoding: 'utf8',
  });
  return readFileSync(join(directory, 'calls.log'), 'utf8').split('\n').filter(Boolean);
}

function deletedLogGroups(calls: string[]): string[] {
  return calls
    .filter((call) => call.startsWith('logs delete-log-group'))
    .map((call) => call.replace(/^.*--log-group-name (\S+).*$/, '$1'));
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('preflight-preview-recovery.sh', () => {
  it('leaves every log group of a live stack in place', () => {
    const calls = runPreflight('UPDATE_COMPLETE');

    expect(deletedLogGroups(calls)).toStrictEqual([]);
    expect(calls.some((call) => call.startsWith('logs create-log-group'))).toBe(false);
  });

  it('sweeps the log groups a destroyed stack left behind', () => {
    expect(deletedLogGroups(runPreflight(''))).toStrictEqual(STACK_LOG_GROUPS);
  });

  it('deletes a rolled-back stack before sweeping what it left', () => {
    const calls = runPreflight('ROLLBACK_COMPLETE');

    expect(calls.findIndex((call) => call.startsWith('cloudformation delete-stack'))).toBeLessThan(
      calls.findIndex((call) => call.startsWith('logs delete-log-group')),
    );
    expect(deletedLogGroups(calls)).toStrictEqual(STACK_LOG_GROUPS);
  });
});
