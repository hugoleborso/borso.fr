import { z } from 'zod';
import { requireAt } from './require-at.core';
import { startOfWeek, type DefectDot } from './weak-points.core';

export type Pillar = 'security' | 'stability' | 'speed';

export type SourceStatus =
  | { readonly kind: 'ok' }
  | { readonly kind: 'unavailable'; readonly reason: string }
  | { readonly kind: 'not-applicable'; readonly reason: string };

export interface WeeklyValue {
  readonly weekStart: string;
  readonly value: number | null;
}

export interface Indicator {
  readonly id: string;
  readonly pillar: Pillar;
  readonly label: string;
  readonly unit: 'count' | 'ms';
  readonly app: string;
  readonly current: number | null;
  readonly weeks: readonly WeeklyValue[];
  readonly status: SourceStatus;
}

export type SourceResult<Value> =
  | { readonly kind: 'ok'; readonly value: Value }
  | { readonly kind: 'unavailable'; readonly reason: string };

export interface HttpApi {
  readonly app: string;
  readonly stage: 'prod' | 'preview';
  readonly apiId: string;
}

export interface MetricQuery {
  readonly Id: string;
  readonly MetricStat: {
    readonly Metric: {
      readonly Namespace: string;
      readonly MetricName: string;
      readonly Dimensions: readonly { readonly Name: string; readonly Value: string }[];
    };
    readonly Period: number;
    readonly Stat: string;
  };
}

export interface MetricSeries {
  readonly id: string;
  readonly points: readonly { readonly timestamp: string; readonly value: number }[];
}

export interface BugReport {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface SecurityCounts {
  readonly criticalOrHigh: number;
  readonly other: number;
}

export interface SentryCount {
  readonly project: string;
  readonly environment: string;
  readonly count: number;
}

export interface Target {
  readonly indicatorId: string;
  readonly app: string;
  readonly ceiling: number;
}

export const FULL_STACK_APPS: readonly string[] = [
  'pragma',
  'last-loop-lepin',
  'banana-rush',
  'talos',
];
export const FRONT_END_APPS: readonly string[] = ['borso-fr', 'borsouvertures'];
export const SENTRY_APPS: readonly string[] = ['pragma', 'last-loop-lepin'];
export const BUG_REPORT_APP = 'pragma';
export const REPOSITORY_ROW = 'repository';
export const WEEKS_SHOWN = 8;
export const SECONDS_PER_WEEK = 604_800;

const MILLISECONDS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const ISO_DATE_LENGTH = 10;
const API_NAME_PATTERN = /^(.+)-(prod|preview)-api$/;
const HTTP_PROTOCOL = 'HTTP';
const GATEWAY_NAMESPACE = 'AWS/ApiGateway';
const CLOSED_IMPROVEMENT_STATUSES: ReadonlySet<string> = new Set(['shipped', 'declined']);
const CRITICAL_OR_HIGH: ReadonlySet<string> = new Set(['critical', 'high']);
const BUG_REPORT_ZONE = 'apps/pragma';
const BUG_REPORT_LINK = 'https://pragma.borso.fr/improvements';
const TARGET_ROW_PATTERN = /^\|\s*`([a-z0-9-]+)`\s*\|\s*([a-z0-9-]+)\s*\|\s*([0-9.]+)\s*\|/;
const NO_API_REASON = 'no API';
const NO_PREVIEW_REASON = 'no preview deployed';
const NO_PRODUCTION_API_REASON = 'no production API deployed';
const NO_SENTRY_REASON = 'Sentry not connected';
const NO_BUG_REPORTS_REASON = 'bug reports are collected in pragma only';

export const METRIC_KINDS = ['latencyP50', 'latencyP95', 'serverErrors'] as const;
type MetricKind = (typeof METRIC_KINDS)[number];
const METRIC_DEFINITIONS: Readonly<
  Record<MetricKind, { readonly name: string; readonly stat: string }>
> = {
  latencyP50: { name: 'Latency', stat: 'p50' },
  latencyP95: { name: 'Latency', stat: 'p95' },
  serverErrors: { name: '5xx', stat: 'Sum' },
};

function isoDateOf(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, ISO_DATE_LENGTH);
}

export function listWeekStarts(now: string): readonly string[] {
  const currentWeek = Date.parse(`${startOfWeek(now)}T00:00:00Z`);
  return Array.from({ length: WEEKS_SHOWN }, (_, index) =>
    isoDateOf(currentWeek - (WEEKS_SHOWN - 1 - index) * DAYS_PER_WEEK * MILLISECONDS_PER_DAY),
  );
}

export function selectHttpApis(items: readonly unknown[]): readonly HttpApi[] {
  const schema = z.object({ Name: z.string(), ApiId: z.string(), ProtocolType: z.string() });
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success || parsed.data.ProtocolType !== HTTP_PROTOCOL) return [];
    const name = API_NAME_PATTERN.exec(parsed.data.Name);
    if (name === null) return [];
    const stage = requireAt(name, 2) === 'prod' ? 'prod' : 'preview';
    return [{ app: requireAt(name, 1), stage, apiId: parsed.data.ApiId }];
  });
}

export function metricQueryId(api: HttpApi, kind: MetricKind): string {
  return `${kind}_${api.apiId.replaceAll(/[^a-zA-Z0-9]/g, '')}`;
}

export function buildMetricQueries(apis: readonly HttpApi[]): readonly MetricQuery[] {
  return apis.flatMap((api) =>
    METRIC_KINDS.filter((kind) => api.stage === 'prod' || kind === 'serverErrors').map((kind) => {
      const definition = METRIC_DEFINITIONS[kind];
      return {
        Id: metricQueryId(api, kind),
        MetricStat: {
          Metric: {
            Namespace: GATEWAY_NAMESPACE,
            MetricName: definition.name,
            Dimensions: [{ Name: 'ApiId', Value: api.apiId }],
          },
          Period: SECONDS_PER_WEEK,
          Stat: definition.stat,
        },
      };
    }),
  );
}

export function readMetricSeries(response: unknown): readonly MetricSeries[] {
  const schema = z.object({
    MetricDataResults: z.array(
      z.object({ Id: z.string(), Timestamps: z.array(z.string()), Values: z.array(z.number()) }),
    ),
  });
  return schema.parse(response).MetricDataResults.map((result) => ({
    id: result.Id,
    points: result.Timestamps.map((timestamp, index) => ({
      timestamp,
      value: result.Values[index] ?? 0,
    })),
  }));
}

function findSeries(series: readonly MetricSeries[], id: string): MetricSeries | undefined {
  return series.find((candidate) => candidate.id === id);
}

function combinePoints(
  apis: readonly HttpApi[],
  series: readonly MetricSeries[],
  kind: MetricKind,
  isInWindow: (timestamp: string) => boolean,
): number | null {
  const values = apis.flatMap((api) =>
    (findSeries(series, metricQueryId(api, kind))?.points ?? [])
      .filter((point) => isInWindow(point.timestamp))
      .map((point) => point.value),
  );
  if (kind === 'serverErrors') return values.reduce((total, value) => total + value, 0);
  if (values.length === 0) return null;
  return Math.round(Math.max(...values));
}

function weekOf(timestamp: string): string {
  return startOfWeek(timestamp.slice(0, ISO_DATE_LENGTH));
}

interface GatewayReading {
  readonly apis: readonly HttpApi[];
  readonly rolling: readonly MetricSeries[];
  readonly weekly: readonly MetricSeries[];
}

function buildGatewayIndicator(
  definition: {
    readonly id: string;
    readonly pillar: Pillar;
    readonly label: string;
    readonly unit: 'count' | 'ms';
  },
  kind: MetricKind,
  stage: 'prod' | 'preview',
  app: string,
  reading: SourceResult<GatewayReading>,
  weekStarts: readonly string[],
): Indicator {
  const empty = {
    ...definition,
    app,
    current: null,
    weeks: weekStarts.map((weekStart) => ({ weekStart, value: null })),
  };
  if (!FULL_STACK_APPS.includes(app)) {
    return { ...empty, status: { kind: 'not-applicable', reason: NO_API_REASON } };
  }
  if (reading.kind === 'unavailable') return { ...empty, status: reading };
  const apis = reading.value.apis.filter((api) => api.app === app && api.stage === stage);
  if (apis.length === 0) {
    const reason = stage === 'preview' ? NO_PREVIEW_REASON : NO_PRODUCTION_API_REASON;
    return { ...empty, status: { kind: 'not-applicable', reason } };
  }
  return {
    ...definition,
    app,
    current: combinePoints(apis, reading.value.rolling, kind, () => true),
    weeks: weekStarts.map((weekStart) => ({
      weekStart,
      value: combinePoints(
        apis,
        reading.value.weekly,
        kind,
        (timestamp) => weekOf(timestamp) === weekStart,
      ),
    })),
    status: { kind: 'ok' },
  };
}

export function buildGatewayIndicators(
  reading: SourceResult<GatewayReading>,
  apps: readonly string[],
  now: string,
): readonly Indicator[] {
  const weekStarts = listWeekStarts(now);
  return apps.flatMap((app) => [
    buildGatewayIndicator(
      {
        id: 'errors-preview',
        pillar: 'stability',
        label: 'API 5xx on previews, 7 days',
        unit: 'count',
      },
      'serverErrors',
      'preview',
      app,
      reading,
      weekStarts,
    ),
    buildGatewayIndicator(
      {
        id: 'errors-prod',
        pillar: 'stability',
        label: 'API 5xx in production, 7 days',
        unit: 'count',
      },
      'serverErrors',
      'prod',
      app,
      reading,
      weekStarts,
    ),
    buildGatewayIndicator(
      { id: 'latency-p50', pillar: 'speed', label: 'API latency p50, 7 days', unit: 'ms' },
      'latencyP50',
      'prod',
      app,
      reading,
      weekStarts,
    ),
    buildGatewayIndicator(
      { id: 'latency-p95', pillar: 'speed', label: 'API latency p95, 7 days', unit: 'ms' },
      'latencyP95',
      'prod',
      app,
      reading,
      weekStarts,
    ),
  ]);
}

export function readSentryCounts(response: unknown): readonly SentryCount[] {
  const schema = z.object({
    data: z.array(
      z.object({ project: z.string(), environment: z.string().nullable(), 'count()': z.number() }),
    ),
  });
  return schema.parse(response).data.map((row) => ({
    project: row.project,
    environment: row.environment ?? '',
    count: row['count()'],
  }));
}

export interface SentryReading {
  readonly rolling: readonly SentryCount[];
  readonly weekly: ReadonlyMap<string, readonly SentryCount[]>;
}

function sumSentry(counts: readonly SentryCount[], app: string, environment: string): number {
  return counts
    .filter((count) => count.project === app && count.environment === environment)
    .reduce((total, count) => total + count.count, 0);
}

export function buildSentryIndicators(
  reading: SourceResult<SentryReading>,
  apps: readonly string[],
  now: string,
): readonly Indicator[] {
  const weekStarts = listWeekStarts(now);
  const definitions = [
    {
      id: 'sentry-errors-preview',
      environment: 'preview',
      label: 'Sentry errors on previews, 7 days',
    },
    { id: 'sentry-errors-prod', environment: 'prod', label: 'Sentry errors in production, 7 days' },
  ];
  return apps.flatMap((app) =>
    definitions.map((definition): Indicator => {
      const base = {
        id: definition.id,
        pillar: 'stability' as const,
        label: definition.label,
        unit: 'count' as const,
        app,
      };
      const empty = {
        ...base,
        current: null,
        weeks: weekStarts.map((weekStart) => ({ weekStart, value: null })),
      };
      if (!SENTRY_APPS.includes(app))
        return { ...empty, status: { kind: 'not-applicable', reason: NO_SENTRY_REASON } };
      if (reading.kind === 'unavailable') return { ...empty, status: reading };
      return {
        ...base,
        current: sumSentry(reading.value.rolling, app, definition.environment),
        weeks: weekStarts.map((weekStart) => {
          const counts = reading.value.weekly.get(weekStart);
          return {
            weekStart,
            value: counts === undefined ? null : sumSentry(counts, app, definition.environment),
          };
        }),
        status: { kind: 'ok' },
      };
    }),
  );
}

export function readBugReports(csv: string): readonly BugReport[] {
  const schema = z.object({
    id: z.string().min(1),
    title: z.string(),
    status: z.string().min(1),
    createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  });
  return csv
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [id, status, createdAt, ...titleParts] = line.split('\t');
      return schema.parse({ id, status, createdAt, title: titleParts.join('\t') });
    });
}

export function buildBugReportIndicators(
  reading: SourceResult<readonly BugReport[]>,
  apps: readonly string[],
  now: string,
): readonly Indicator[] {
  const weekStarts = listWeekStarts(now);
  return apps.map((app): Indicator => {
    const base = {
      id: 'user-bug-reports-open',
      pillar: 'stability' as const,
      label: 'Bug reports from users, open',
      unit: 'count' as const,
      app,
    };
    const empty = {
      ...base,
      current: null,
      weeks: weekStarts.map((weekStart) => ({ weekStart, value: null })),
    };
    if (app !== BUG_REPORT_APP)
      return { ...empty, status: { kind: 'not-applicable', reason: NO_BUG_REPORTS_REASON } };
    if (reading.kind === 'unavailable') return { ...empty, status: reading };
    const open = reading.value.filter((report) => !CLOSED_IMPROVEMENT_STATUSES.has(report.status));
    return {
      ...base,
      current: open.length,
      weeks: weekStarts.map((weekStart) => ({
        weekStart,
        value: reading.value.filter(
          (report) => startOfWeek(report.createdAt.slice(0, ISO_DATE_LENGTH)) === weekStart,
        ).length,
      })),
      status: { kind: 'ok' },
    };
  });
}

export function placeBugReports(reports: readonly BugReport[]): readonly DefectDot[] {
  return reports.map((report) => ({
    slug: `improvement-${report.id}`,
    title: `Bug report: ${report.title}`,
    date: report.createdAt.slice(0, ISO_DATE_LENGTH),
    zone: BUG_REPORT_ZONE,
    weakPoint: null,
    recurs: [],
    stage: 'E',
    link: BUG_REPORT_LINK,
  }));
}

export function readDependabotCounts(alerts: readonly unknown[]): SecurityCounts {
  const schema = z.object({ security_advisory: z.object({ severity: z.string() }) });
  const severities = alerts.map((alert) => schema.parse(alert).security_advisory.severity);
  const criticalOrHigh = severities.filter((severity) => CRITICAL_OR_HIGH.has(severity)).length;
  return { criticalOrHigh, other: severities.length - criticalOrHigh };
}

export function readAuditCounts(report: unknown): SecurityCounts {
  const schema = z.object({
    metadata: z.object({
      vulnerabilities: z.object({
        info: z.number(),
        low: z.number(),
        moderate: z.number(),
        high: z.number(),
        critical: z.number(),
      }),
    }),
  });
  const counts = schema.parse(report).metadata.vulnerabilities;
  return {
    criticalOrHigh: counts.critical + counts.high,
    other: counts.moderate + counts.low + counts.info,
  };
}

export interface SecurityReading {
  readonly dependabot: SourceResult<SecurityCounts>;
  readonly audit: SourceResult<SecurityCounts>;
  readonly secretScanning: SourceResult<number>;
}

function currentOnly(
  definition: { readonly id: string; readonly label: string },
  reading: SourceResult<number>,
  weekStarts: readonly string[],
): Indicator {
  const isOk = reading.kind === 'ok';
  return {
    ...definition,
    pillar: 'security',
    unit: 'count',
    app: REPOSITORY_ROW,
    current: isOk ? reading.value : null,
    weeks: weekStarts.map((weekStart) => ({ weekStart, value: null })),
    status: isOk ? { kind: 'ok' } : reading,
  };
}

function mapResult<Value, Mapped>(
  result: SourceResult<Value>,
  map: (value: Value) => Mapped,
): SourceResult<Mapped> {
  return result.kind === 'ok' ? { kind: 'ok', value: map(result.value) } : result;
}

export function buildSecurityIndicators(
  reading: SecurityReading,
  now: string,
): readonly Indicator[] {
  const weekStarts = listWeekStarts(now);
  return [
    currentOnly(
      { id: 'dependabot-critical-high', label: 'Dependabot alerts, critical or high' },
      mapResult(reading.dependabot, (counts) => counts.criticalOrHigh),
      weekStarts,
    ),
    currentOnly(
      { id: 'dependabot-other', label: 'Dependabot alerts, moderate or low' },
      mapResult(reading.dependabot, (counts) => counts.other),
      weekStarts,
    ),
    currentOnly(
      { id: 'audit-critical-high', label: 'pnpm audit, critical or high' },
      mapResult(reading.audit, (counts) => counts.criticalOrHigh),
      weekStarts,
    ),
    currentOnly(
      { id: 'audit-other', label: 'pnpm audit, moderate or lower' },
      mapResult(reading.audit, (counts) => counts.other),
      weekStarts,
    ),
    currentOnly(
      { id: 'secret-scanning-open', label: 'Secret scanning alerts, open' },
      reading.secretScanning,
      weekStarts,
    ),
  ];
}

export function readTargets(markdown: string): readonly Target[] {
  return markdown.split('\n').flatMap((line) => {
    const row = TARGET_ROW_PATTERN.exec(line);
    if (row === null) return [];
    return [
      {
        indicatorId: requireAt(row, 1),
        app: requireAt(row, 2),
        ceiling: Number(requireAt(row, 3)),
      },
    ];
  });
}

export type TargetVerdict = 'within' | 'over' | 'none';

export function judgeAgainstTarget(
  indicator: Indicator,
  targets: readonly Target[],
): TargetVerdict {
  const target = targets.find(
    (candidate) => candidate.indicatorId === indicator.id && candidate.app === indicator.app,
  );
  if (target === undefined || indicator.current === null) return 'none';
  return indicator.current <= target.ceiling ? 'within' : 'over';
}

export function listUnavailableSources(
  sources: ReadonlyMap<string, SourceResult<unknown>>,
): readonly string[] {
  return [...sources].flatMap(([name, result]) =>
    result.kind === 'unavailable' ? [`${name}: ${result.reason}`] : [],
  );
}

export function isEverySourceUnavailable(
  sources: ReadonlyMap<string, SourceResult<unknown>>,
): boolean {
  return sources.size > 0 && [...sources.values()].every((result) => result.kind === 'unavailable');
}
