import { execFileSync, spawnSync } from 'node:child_process';
import { z } from 'zod';
import {
  buildMetricQueries,
  listWeekStarts,
  readAuditCounts,
  readBugReports,
  readDependabotCounts,
  readMetricSeries,
  readSentryCounts,
  selectHttpApis,
  type BugReport,
  type HttpApi,
  type MetricSeries,
  type SecurityCounts,
  type SentryCount,
  type SentryReading,
  type SourceResult,
} from './quality-dashboard.core';

const AWS_REGION = process.env.AWS_REGION ?? 'eu-west-3';
const SENTRY_HOST = 'https://de.sentry.io';
const GITHUB_API = 'https://api.github.com';
const PAGE_SIZE = 100;
const MILLISECONDS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const ISO_DATE_LENGTH = 10;
const MAX_BUFFER = 64 * 1024 * 1024;
const QUALITY_READER = 'quality_reader';
const BUG_REPORT_QUERY =
  "SELECT id, status, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'), translate(title, E'\\t\\n\\r', '   ') FROM prod.improvement WHERE kind = 'bug' ORDER BY created_at";

function describeFailure(error: unknown): string {
  return error instanceof Error ? (error.message.split('\n')[0] ?? error.name) : String(error);
}

async function attempt<Value>(read: () => Promise<Value>): Promise<SourceResult<Value>> {
  try {
    return { kind: 'ok', value: await read() };
  } catch (error) {
    return { kind: 'unavailable', reason: describeFailure(error) };
  }
}

function requireVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} is not set`);
  return value;
}

function runAws(argumentsList: readonly string[]): unknown {
  const output = execFileSync(
    'aws',
    [...argumentsList, '--region', AWS_REGION, '--output', 'json'],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const parsed: unknown = JSON.parse(output);
  return parsed;
}

function fetchMetricSeries(
  apis: readonly HttpApi[],
  start: Date,
  end: Date,
): readonly MetricSeries[] {
  const queries = buildMetricQueries(apis);
  if (queries.length === 0) return [];
  return readMetricSeries(
    runAws([
      'cloudwatch',
      'get-metric-data',
      '--metric-data-queries',
      JSON.stringify(queries),
      '--start-time',
      start.toISOString(),
      '--end-time',
      end.toISOString(),
    ]),
  );
}

export function readGateway(now: Date): Promise<
  SourceResult<{
    readonly apis: readonly HttpApi[];
    readonly rolling: readonly MetricSeries[];
    readonly weekly: readonly MetricSeries[];
  }>
> {
  return attempt(() => {
    const apis = selectHttpApis(
      z.object({ Items: z.array(z.unknown()) }).parse(runAws(['apigatewayv2', 'get-apis'])).Items,
    );
    const weekStart = new Date(
      `${listWeekStarts(now.toISOString().slice(0, ISO_DATE_LENGTH))[0] ?? ''}T00:00:00Z`,
    );
    const rollingStart = new Date(now.getTime() - DAYS_PER_WEEK * MILLISECONDS_PER_DAY);
    return Promise.resolve({
      apis,
      rolling: fetchMetricSeries(apis, rollingStart, now),
      weekly: fetchMetricSeries(apis, weekStart, now),
    });
  });
}

async function fetchJson(url: string, token: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(`${url.split('?')[0] ?? url} answered ${String(response.status)}`);
  const parsed: unknown = await response.json();
  return parsed;
}

async function fetchSentryWindow(start: Date, end: Date): Promise<readonly SentryCount[]> {
  const organisation = requireVariable('SENTRY_ORG');
  const token = requireVariable('SENTRY_READ_TOKEN');
  const query = new URLSearchParams([
    ['dataset', 'errors'],
    ['field', 'project'],
    ['field', 'environment'],
    ['field', 'count()'],
    ['project', '-1'],
    ['start', start.toISOString()],
    ['end', end.toISOString()],
    ['per_page', String(PAGE_SIZE)],
  ]);
  return readSentryCounts(
    await fetchJson(
      `${SENTRY_HOST}/api/0/organizations/${organisation}/events/?${query.toString()}`,
      token,
    ),
  );
}

export function readSentry(now: Date): Promise<SourceResult<SentryReading>> {
  return attempt(async () => {
    const rolling = await fetchSentryWindow(
      new Date(now.getTime() - DAYS_PER_WEEK * MILLISECONDS_PER_DAY),
      now,
    );
    const weekly = new Map<string, readonly SentryCount[]>();
    for (const weekStart of listWeekStarts(now.toISOString().slice(0, ISO_DATE_LENGTH))) {
      const start = new Date(`${weekStart}T00:00:00Z`);
      const end = new Date(
        Math.min(now.getTime(), start.getTime() + DAYS_PER_WEEK * MILLISECONDS_PER_DAY),
      );
      weekly.set(weekStart, await fetchSentryWindow(start, end));
    }
    return { rolling, weekly };
  });
}

function githubAddress(path: string): string {
  return `${GITHUB_API}/repos/${requireVariable('GITHUB_REPOSITORY')}/${path}?state=open&per_page=${String(PAGE_SIZE)}`;
}

async function fetchGithubList(path: string): Promise<readonly unknown[]> {
  const response = await fetchJson(githubAddress(path), requireVariable('GITHUB_TOKEN'));
  if (!Array.isArray(response)) throw new Error(`${path} did not answer a list`);
  return response;
}

export function readDependabot(): Promise<SourceResult<SecurityCounts>> {
  return attempt(async () => readDependabotCounts(await fetchGithubList('dependabot/alerts')));
}

export function readSecretScanning(): Promise<SourceResult<number>> {
  return attempt(async () => (await fetchGithubList('secret-scanning/alerts')).length);
}

export function readAudit(): Promise<SourceResult<SecurityCounts>> {
  return attempt(() => {
    const audit = spawnSync('pnpm', ['audit', '--json'], {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    });
    if (audit.error !== undefined) throw audit.error;
    const parsed: unknown = JSON.parse(audit.stdout);
    return Promise.resolve(readAuditCounts(parsed));
  });
}

export function readPragmaBugReports(): Promise<SourceResult<readonly BugReport[]>> {
  return attempt(() => {
    const endpoint = requireVariable('PRAGMA_DSQL_ENDPOINT');
    const token = execFileSync(
      'aws',
      ['dsql', 'generate-db-connect-auth-token', '--hostname', endpoint, '--region', AWS_REGION],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
    const query = spawnSync(
      'psql',
      [
        `host=${endpoint} dbname=postgres user=${QUALITY_READER} sslmode=require`,
        '--quiet',
        '--no-align',
        '--tuples-only',
        '--field-separator=\t',
        '--command',
        BUG_REPORT_QUERY,
      ],
      { encoding: 'utf8', maxBuffer: MAX_BUFFER, env: { ...process.env, PGPASSWORD: token } },
    );
    if (query.error !== undefined) throw query.error;
    if (query.status !== 0) throw new Error(query.stderr.split('\n')[0] ?? 'psql failed');
    return Promise.resolve(readBugReports(query.stdout));
  });
}
