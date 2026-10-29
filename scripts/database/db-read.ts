import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AGENT_READER_FUNCTION_NAME_OUTPUT,
  DEFAULT_APP,
  DEFAULT_STAGE,
  decideReadTarget,
  isAgentReaderFunctionName,
  READER_NOT_PROVISIONED_REFUSAL,
  readQueryArguments,
} from './read-target.utils';
import { formatRows, readInvocationOutcome } from './reader-invocation.utils';

const REGION = process.env.AWS_REGION ?? 'eu-west-3';
const USAGE_EXIT_CODE = 2;
const REFUSAL_EXIT_CODE = 3;
const FAILURE_EXIT_CODE = 4;
const RESPONSE_FILE_NAME = 'reader-response.json';
const TEMPORARY_DIRECTORY_PREFIX = 'borso-db-read-';

function fail(message: string, exitCode: number): never {
  process.stderr.write(`[db:read] ${message}\n`);
  process.exit(exitCode);
}

function runAws(argumentsForAws: readonly string[], output = 'text'): string {
  return execFileSync('aws', [...argumentsForAws, '--region', REGION, '--output', output], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const query = readQueryArguments(process.argv.slice(2));
if (query === '') {
  fail(
    'usage: scripts/db-read.sh "<one SELECT or WITH … SELECT statement>"\n' +
      `  APP (pragma, last-loop-lepin or banana-rush; default ${DEFAULT_APP}) and STAGE (default ${DEFAULT_STAGE}) pick the schema.\n` +
      "  The statement is assessed and run inside the application's reader Lambda (ADR-0049), never here.",
    USAGE_EXIT_CODE,
  );
}

const target = decideReadTarget(process.env.APP ?? DEFAULT_APP, process.env.STAGE ?? DEFAULT_STAGE);
if (!target.accepted) fail(`refused: ${target.reason}`, REFUSAL_EXIT_CODE);

const functionName = runAws([
  'cloudformation',
  'describe-stacks',
  '--stack-name',
  target.stackName,
  '--query',
  `Stacks[0].Outputs[?OutputKey=='${AGENT_READER_FUNCTION_NAME_OUTPUT}'].OutputValue | [0]`,
]);
if (!isAgentReaderFunctionName(functionName)) {
  fail(`refused: ${READER_NOT_PROVISIONED_REFUSAL}`, REFUSAL_EXIT_CODE);
}

process.stderr.write(
  `[db:read] ${target.app} schema ${target.schemaName} through ${functionName}, read only\n`,
);

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
      JSON.stringify({ query }),
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

  const outcome = readInvocationOutcome(readFileSync(responsePath, 'utf8'), functionError);
  if (outcome.kind === 'refused') fail(`refused: ${outcome.reason}`, REFUSAL_EXIT_CODE);
  if (outcome.kind === 'failed') fail(outcome.reason, FAILURE_EXIT_CODE);

  process.stdout.write(formatRows(outcome.rows).join('\n'));
  process.stdout.write('\n');
  process.stderr.write(
    `[db:read] ${String(outcome.rows.length)} row(s) as ${outcome.role}` +
      `${outcome.capped ? ', capped — narrow the query to see the rest' : ''}\n`,
  );
} finally {
  rmSync(responseDirectory, { recursive: true, force: true });
}
