import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AGENT_READER_FUNCTION_NAME_OUTPUT, isAgentReaderFunctionName } from './read-target.utils';
import { readInvocationOutcome } from './reader-invocation.utils';
import { decideSmokeVerdict, SMOKE_QUERY } from './smoke-verdict.core';

const REGION = process.env.AWS_REGION ?? 'eu-west-3';
const DEFAULT_STAGE = 'prod';
const USAGE_EXIT_CODE = 2;
const UNHEALTHY_EXIT_CODE = 1;
const RESPONSE_FILE_NAME = 'smoke-response.json';
const TEMPORARY_DIRECTORY_PREFIX = 'borso-smoke-reader-';
const REPLAY_FLAG = '--payload';

function report(message: string): void {
  process.stderr.write(`[smoke-agent-reader] ${message}\n`);
}

function runAws(argumentsForAws: readonly string[], output = 'text'): string {
  return execFileSync('aws', [...argumentsForAws, '--region', REGION, '--output', output], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function judge(rawPayload: string, functionError: string | undefined, subject: string): never {
  const verdict = decideSmokeVerdict(readInvocationOutcome(rawPayload, functionError));
  if (!verdict.healthy) {
    report(`${subject}: ${verdict.reason}`);
    process.exit(UNHEALTHY_EXIT_CODE);
  }
  report(`${subject} answered as ${verdict.role} on schema ${verdict.schema}`);
  process.exit(0);
}

const argumentsAfterScript = process.argv.slice(2);

if (argumentsAfterScript[0] === REPLAY_FLAG) {
  const recordedPath = argumentsAfterScript[1];
  if (recordedPath === undefined) {
    report(`usage: smoke-agent-reader.sh ${REPLAY_FLAG} <recorded-response.json>`);
    process.exit(USAGE_EXIT_CODE);
  }
  judge(readFileSync(recordedPath, 'utf8'), undefined, recordedPath);
}

const app = argumentsAfterScript[0];
if (app === undefined) {
  report(
    `usage: smoke-agent-reader.sh <app> [stage]  |  smoke-agent-reader.sh ${REPLAY_FLAG} <file>`,
  );
  process.exit(USAGE_EXIT_CODE);
}
const stage = argumentsAfterScript[1] ?? DEFAULT_STAGE;

const functionName = runAws([
  'cloudformation',
  'describe-stacks',
  '--stack-name',
  `${app}-${stage}`,
  '--query',
  `Stacks[0].Outputs[?OutputKey=='${AGENT_READER_FUNCTION_NAME_OUTPUT}'].OutputValue | [0]`,
]);

if (!isAgentReaderFunctionName(functionName)) {
  report(`${app} ${stage} publishes no ${AGENT_READER_FUNCTION_NAME_OUTPUT}; nothing to smoke.`);
  process.exit(0);
}

const responseDirectory = mkdtempSync(join(tmpdir(), TEMPORARY_DIRECTORY_PREFIX));
const responsePath = join(responseDirectory, RESPONSE_FILE_NAME);
try {
  const invocation = runAws(
    [
      'lambda',
      'invoke',
      '--function-name',
      functionName,
      '--cli-binary-format',
      'raw-in-base64-out',
      '--payload',
      JSON.stringify({ query: SMOKE_QUERY }),
      responsePath,
    ],
    'json',
  );
  const invocationReport: unknown = JSON.parse(invocation);
  const functionError =
    typeof invocationReport === 'object' &&
    invocationReport !== null &&
    'FunctionError' in invocationReport &&
    typeof invocationReport.FunctionError === 'string'
      ? invocationReport.FunctionError
      : undefined;

  judge(readFileSync(responsePath, 'utf8'), functionError, functionName);
} finally {
  rmSync(responseDirectory, { recursive: true, force: true });
}
