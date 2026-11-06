import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  EMPTY_SNAPSHOT,
  buildMetricQueries,
  readAuditCounts,
  readMetricSeries,
  readSnapshot,
  selectHttpApis,
  type GatewayReading,
  type HttpApi,
  type MetricSeries,
  type RangeSpec,
  type SecurityCounts,
  type Snapshot,
  type SourceResult,
} from './quality-dashboard.core';

const AWS_REGION = process.env.AWS_REGION ?? 'eu-west-3';
const MILLISECONDS_PER_SECOND = 1_000;
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
  periodSeconds: number,
): readonly MetricSeries[] {
  const queries = buildMetricQueries(apis, periodSeconds);
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

export function readHttpApis(): SourceResult<readonly HttpApi[]> {
  return attempt(() =>
    selectHttpApis(
      z.object({ Items: z.array(z.unknown()) }).parse(runAws(['apigatewayv2', 'get-apis'])).Items,
    ),
  );
}

export function readGateway(
  apis: SourceResult<readonly HttpApi[]>,
  now: Date,
  range: RangeSpec,
): SourceResult<GatewayReading> {
  if (apis.kind === 'unavailable') return apis;
  return attempt(() => {
    const windowStart = new Date(now.getTime() - range.windowSeconds * MILLISECONDS_PER_SECOND);
    const historyStart = new Date(
      now.getTime() - range.buckets * range.bucketSeconds * MILLISECONDS_PER_SECOND,
    );
    return {
      apis: apis.value,
      current: fetchMetricSeries(apis.value, windowStart, now, range.windowSeconds),
      buckets: fetchMetricSeries(apis.value, historyStart, now, range.bucketSeconds),
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
