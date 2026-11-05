import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  EMPTY_SNAPSHOT,
  buildMetricQueries,
  listWeekStarts,
  readAuditCounts,
  readMetricSeries,
  readSnapshot,
  selectHttpApis,
  type HttpApi,
  type MetricSeries,
  type SecurityCounts,
  type Snapshot,
  type SourceResult,
} from './quality-dashboard.core';

const AWS_REGION = process.env.AWS_REGION ?? 'eu-west-3';
const MILLISECONDS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const ISO_DATE_LENGTH = 10;
const MAX_BUFFER = 64 * 1024 * 1024;

function describeFailure(error: unknown): string {
  return error instanceof Error ? (error.message.split('\n')[0] ?? error.name) : String(error);
}

function attempt<Value>(read: () => Value): SourceResult<Value> {
  try {
    return { kind: 'ok', value: read() };
  } catch (error) {
    return { kind: 'unavailable', reason: describeFailure(error) };
  }
}

function runAws(argumentsList: readonly string[]): unknown {
  const output = execFileSync(
    'aws',
    [...argumentsList, '--region', AWS_REGION, '--output', 'json'],
    {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
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

export function readGateway(now: Date): SourceResult<{
  readonly apis: readonly HttpApi[];
  readonly rolling: readonly MetricSeries[];
  readonly weekly: readonly MetricSeries[];
}> {
  return attempt(() => {
    const apis = selectHttpApis(
      z.object({ Items: z.array(z.unknown()) }).parse(runAws(['apigatewayv2', 'get-apis'])).Items,
    );
    const firstWeek = listWeekStarts(now.toISOString().slice(0, ISO_DATE_LENGTH))[0] ?? '';
    return {
      apis,
      rolling: fetchMetricSeries(
        apis,
        new Date(now.getTime() - DAYS_PER_WEEK * MILLISECONDS_PER_DAY),
        now,
      ),
      weekly: fetchMetricSeries(apis, new Date(`${firstWeek}T00:00:00Z`), now),
    };
  });
}

export function readAudit(): SourceResult<SecurityCounts> {
  return attempt(() => {
    const audit = spawnSync('pnpm', ['audit', '--json'], {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    });
    if (audit.error !== undefined) throw audit.error;
    const parsed: unknown = JSON.parse(audit.stdout);
    return readAuditCounts(parsed);
  });
}

export function readSnapshotFile(path: string | undefined): SourceResult<Snapshot> {
  if (path === undefined) return { kind: 'ok', value: EMPTY_SNAPSHOT };
  return attempt(() => {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return readSnapshot(parsed);
  });
}
