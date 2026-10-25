import { execFileSync, spawn } from 'node:child_process';
import {
  buildReadOnlySessionCommands,
  DEFAULT_APP,
  DEFAULT_STAGE,
  decideReadOnlyQuery,
  decideReadTarget,
  readQueryArguments,
  ROW_CAP,
} from './read-only-query.utils';

const REGION = process.env.AWS_REGION ?? 'eu-west-3';
const TOKEN_LIFETIME_SECONDS = 900;
const QUERY_TIMEOUT_MILLISECONDS = 30_000;
const FORCED_STOP_GRACE_MILLISECONDS = 5_000;
const CONNECT_TIMEOUT_SECONDS = 10;
const USAGE_EXIT_CODE = 2;
const REFUSAL_EXIT_CODE = 3;

function fail(message: string, exitCode: number): never {
  process.stderr.write(`[db:read] ${message}\n`);
  process.exit(exitCode);
}

function runAws(argumentsForAws: readonly string[]): string {
  return execFileSync('aws', [...argumentsForAws, '--region', REGION, '--output', 'text'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const query = readQueryArguments(process.argv.slice(2));
if (query === '') {
  fail(
    'usage: pnpm run db:read -- "<one SELECT or WITH … SELECT statement>"\n' +
      `  APP (pragma, last-loop-lepin or banana-rush; default ${DEFAULT_APP}) and STAGE (default ${DEFAULT_STAGE}) pick the schema.\n` +
      `  The statement runs as a SELECT-only role in a READ ONLY transaction, capped at ${String(ROW_CAP)} rows.`,
    USAGE_EXIT_CODE,
  );
}

const queryDecision = decideReadOnlyQuery(query);
if (!queryDecision.accepted) fail(`refused: ${queryDecision.reason}`, REFUSAL_EXIT_CODE);

const target = decideReadTarget(process.env.APP ?? DEFAULT_APP, process.env.STAGE ?? DEFAULT_STAGE);
if (!target.accepted) fail(`refused: ${target.reason}`, REFUSAL_EXIT_CODE);

const endpoint = runAws([
  'ssm',
  'get-parameter',
  '--name',
  `/borso/${target.app}/dsql-cluster-endpoint`,
  '--query',
  'Parameter.Value',
]);
const token = runAws([
  'dsql',
  'generate-db-connect-auth-token',
  '--hostname',
  endpoint,
  '--expires-in',
  String(TOKEN_LIFETIME_SECONDS),
]);

const sessionArguments = buildReadOnlySessionCommands(queryDecision.statement, ROW_CAP).flatMap(
  (command) => ['--command', command],
);

process.stderr.write(
  `[db:read] ${target.app} schema ${target.schemaName} as ${target.roleName}, read only, at most ${String(ROW_CAP)} rows\n`,
);

const psql = spawn(
  'psql',
  [
    '--no-psqlrc',
    '--quiet',
    '--pset=pager=off',
    '--set=ON_ERROR_STOP=1',
    ...sessionArguments,
    `host=${endpoint} port=5432 dbname=postgres user=${target.roleName} sslmode=require connect_timeout=${String(CONNECT_TIMEOUT_SECONDS)}`,
  ],
  {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      PGPASSWORD: token,
      PGOPTIONS: `--search_path=${target.schemaName}`,
    },
  },
);

const cancelTimer = setTimeout(() => {
  process.stderr.write(
    `[db:read] cancelled after ${String(QUERY_TIMEOUT_MILLISECONDS / 1000)} s; narrow the query.\n`,
  );
  psql.kill('SIGINT');
  setTimeout(() => psql.kill('SIGKILL'), FORCED_STOP_GRACE_MILLISECONDS).unref();
}, QUERY_TIMEOUT_MILLISECONDS);

psql.on('exit', (code) => {
  clearTimeout(cancelTimer);
  process.exit(code ?? 1);
});
