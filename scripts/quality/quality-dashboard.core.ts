import { z } from 'zod';
import { requireAt } from './require-at.core';
import { startOfWeek, type DefectDot } from './weak-points.core';

export type Pillar = 'security' | 'stability' | 'speed';

export type SourceStatus =
  | { readonly kind: 'ok' }
  | { readonly kind: 'unavailable'; readonly reason: string }
  | { readonly kind: 'not-applicable'; readonly reason: string };

export interface SeriesPoint {
  readonly label: string;
  readonly value: number | null;
}

export type RangeId = 'week' | 'hour' | 'minute';

export interface RangeSpec {
  readonly id: RangeId;
  readonly title: string;
  readonly windowSeconds: number;
  readonly bucketSeconds: number;
  readonly buckets: number;
}

export interface Indicator {
  readonly id: string;
  readonly pillar: Pillar;
  readonly label: string;
  readonly unit: 'count' | 'ms';
  readonly app: string;
  readonly current: number | null;
  readonly points: readonly SeriesPoint[];
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

export interface SentryIssueCount {
  readonly app: string;
  readonly count: number;
}

export interface SentryCount {
  readonly app: string;
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
export const SENTRY_APPS: readonly string[] = [
  'pragma',
  'last-loop-lepin',
  'banana-rush',
  'talos',
  'borso-fr',
  'borsouvertures',
];
export const BUG_REPORT_APP = 'pragma';
export const REPOSITORY_ROW = 'repository';
export const WEEKS_SHOWN = 8;
export const SECONDS_PER_WEEK = 604_800;
export const SECONDS_PER_HOUR = 3_600;
export const SECONDS_PER_MINUTE = 60;
export const HOURS_SHOWN = 12;
export const MINUTES_SHOWN = 60;

export const RANGES: readonly RangeSpec[] = [
  {
    id: 'week',
    title: 'week by week',
    windowSeconds: SECONDS_PER_WEEK,
    bucketSeconds: SECONDS_PER_WEEK,
    buckets: WEEKS_SHOWN,
  },
  {
    id: 'hour',
    title: 'last 12 hours',
    windowSeconds: HOURS_SHOWN * SECONDS_PER_HOUR,
    bucketSeconds: SECONDS_PER_HOUR,
    buckets: HOURS_SHOWN,
  },
  {
    id: 'minute',
    title: 'last 60 minutes',
    windowSeconds: MINUTES_SHOWN * SECONDS_PER_MINUTE,
    bucketSeconds: SECONDS_PER_MINUTE,
    buckets: MINUTES_SHOWN,
  },
];

const MILLISECONDS_PER_DAY = 86_400_000;
const MILLISECONDS_PER_SECOND = 1_000;
const CLOCK_LABEL_START = 11;
const CLOCK_LABEL_END = 16;
const DAYS_PER_WEEK = 7;
const ISO_DATE_LENGTH = 10;
const API_NAME_PATTERN = /^(.+)-(prod|preview)-api$/;
const HTTP_PROTOCOL = 'HTTP';
const GATEWAY_NAMESPACE = 'AWS/ApiGateway';
const FUNCTION_NAMESPACE = 'AWS/Lambda';
const CLOSED_IMPROVEMENT_STATUSES: ReadonlySet<string> = new Set(['shipped', 'declined']);
const BUG_REPORT_ZONE = 'apps/pragma';
const BUG_KIND = 'bug';
const BUG_REPORT_LINK = 'https://pragma.borso.fr/improvements';
const TARGET_ROW_PATTERN = /^\|\s*`([a-z0-9-]+)`\s*\|\s*([a-z0-9-]+)\s*\|\s*([0-9.]+)\s*\|/;
const NO_API_REASON = 'no API';
const NO_PREVIEW_REASON = 'no preview deployed';
const NO_PRODUCTION_API_REASON = 'no production API deployed';
const NO_SENTRY_REASON = 'no Sentry';
const NO_BUG_REPORTS_REASON = 'pragma only';

export const METRIC_KINDS = ['latencyP50', 'latencyP95', 'serverErrors', 'throttles'] as const;
type MetricKind = (typeof METRIC_KINDS)[number];
const SUMMED_KINDS: ReadonlySet<MetricKind> = new Set(['serverErrors', 'throttles']);
const PREVIEW_KINDS: ReadonlySet<MetricKind> = new Set(['serverErrors']);
const METRIC_DEFINITIONS: Readonly<
  Record<MetricKind, { readonly namespace: string; readonly name: string; readonly stat: string }>
> = {
  latencyP50: { namespace: GATEWAY_NAMESPACE, name: 'Latency', stat: 'p50' },
  latencyP95: { namespace: GATEWAY_NAMESPACE, name: 'Latency', stat: 'p95' },
  serverErrors: { namespace: GATEWAY_NAMESPACE, name: '5xx', stat: 'Sum' },
  throttles: { namespace: FUNCTION_NAMESPACE, name: 'Throttles', stat: 'Sum' },
};

function selectDimension(
  api: HttpApi,
  kind: MetricKind,
): { readonly Name: string; readonly Value: string } {
  if (METRIC_DEFINITIONS[kind].namespace === FUNCTION_NAMESPACE) {
    return { Name: 'FunctionName', Value: `${api.app}-${api.stage}-api` };
  }
  return { Name: 'ApiId', Value: api.apiId };
}

function isoDateOf(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, ISO_DATE_LENGTH);
}

export function listWeekStarts(now: string): readonly string[] {
  const currentWeek = Date.parse(`${startOfWeek(now)}T00:00:00Z`);
  return Array.from({ length: WEEKS_SHOWN }, (_, index) =>
    isoDateOf(currentWeek - (WEEKS_SHOWN - 1 - index) * DAYS_PER_WEEK * MILLISECONDS_PER_DAY),
  );
}

function clockLabel(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(CLOCK_LABEL_START, CLOCK_LABEL_END);
}

function floorToBucket(milliseconds: number, bucketSeconds: number): number {
  const size = bucketSeconds * MILLISECONDS_PER_SECOND;
  return Math.floor(milliseconds / size) * size;
}

export function listBuckets(range: RangeSpec, now: Date): readonly string[] {
  if (range.id === 'week') return listWeekStarts(now.toISOString().slice(0, ISO_DATE_LENGTH));
  const last = floorToBucket(now.getTime(), range.bucketSeconds);
  const size = range.bucketSeconds * MILLISECONDS_PER_SECOND;
  return Array.from({ length: range.buckets }, (_, index) =>
    clockLabel(last - (range.buckets - 1 - index) * size),
  );
}

export function bucketOf(range: RangeSpec, timestamp: string): string {
  if (range.id === 'week') return startOfWeek(timestamp.slice(0, ISO_DATE_LENGTH));
  return clockLabel(floorToBucket(Date.parse(timestamp), range.bucketSeconds));
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

export function buildMetricQueries(
  apis: readonly HttpApi[],
  periodSeconds: number,
): readonly MetricQuery[] {
  return apis.flatMap((api) =>
    METRIC_KINDS.filter((kind) => api.stage === 'prod' || PREVIEW_KINDS.has(kind)).map((kind) => {
      const definition = METRIC_DEFINITIONS[kind];
      return {
        Id: metricQueryId(api, kind),
        MetricStat: {
          Metric: {
            Namespace: definition.namespace,
            MetricName: definition.name,
            Dimensions: [selectDimension(api, kind)],
          },
          Period: periodSeconds,
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
  if (SUMMED_KINDS.has(kind)) return values.reduce((total, value) => total + value, 0);
  if (values.length === 0) return null;
  return Math.round(Math.max(...values));
}

export interface GatewayReading {
  readonly apis: readonly HttpApi[];
  readonly current: readonly MetricSeries[];
  readonly buckets: readonly MetricSeries[];
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
  range: RangeSpec,
  buckets: readonly string[],
): Indicator {
  const empty = {
    ...definition,
    app,
    current: null,
    points: buckets.map((label) => ({ label, value: null })),
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
    current: combinePoints(apis, reading.value.current, kind, () => true),
    points: buckets.map((label) => ({
      label,
      value: combinePoints(
        apis,
        reading.value.buckets,
        kind,
        (timestamp) => bucketOf(range, timestamp) === label,
      ),
    })),
    status: { kind: 'ok' },
  };
}

export function buildGatewayIndicators(
  reading: SourceResult<GatewayReading>,
  apps: readonly string[],
  range: RangeSpec,
  buckets: readonly string[],
): readonly Indicator[] {
  return apps.flatMap((app) => [
    buildGatewayIndicator(
      {
        id: 'errors-preview',
        pillar: 'stability',
        label: '5xx, previews',
        unit: 'count',
      },
      'serverErrors',
      'preview',
      app,
      reading,
      range,
      buckets,
    ),
    buildGatewayIndicator(
      {
        id: 'errors-prod',
        pillar: 'stability',
        label: '5xx, production',
        unit: 'count',
      },
      'serverErrors',
      'prod',
      app,
      reading,
      range,
      buckets,
    ),
    buildGatewayIndicator(
      {
        id: 'throttles-prod',
        pillar: 'stability',
        label: 'Throttled requests, production',
        unit: 'count',
      },
      'throttles',
      'prod',
      app,
      reading,
      range,
      buckets,
    ),
    buildGatewayIndicator(
      { id: 'latency-p50', pillar: 'speed', label: 'p50', unit: 'ms' },
      'latencyP50',
      'prod',
      app,
      reading,
      range,
      buckets,
    ),
    buildGatewayIndicator(
      { id: 'latency-p95', pillar: 'speed', label: 'p95', unit: 'ms' },
      'latencyP95',
      'prod',
      app,
      reading,
      range,
      buckets,
    ),
  ]);
}

export interface SentryReading {
  readonly rolling: readonly SentryCount[];
  readonly history: ReadonlyMap<string, readonly SentryCount[]>;
}

function sumSentry(counts: readonly SentryCount[], app: string, environment: string): number {
  return counts
    .filter((count) => count.app === app && count.environment === environment)
    .reduce((total, count) => total + count.count, 0);
}

export function buildSentryIndicators(
  reading: SourceResult<SentryReading>,
  apps: readonly string[],
  buckets: readonly string[],
): readonly Indicator[] {
  const definitions = [
    {
      id: 'sentry-errors-preview',
      environment: 'preview',
      label: 'Sentry errors, previews',
    },
    { id: 'sentry-errors-prod', environment: 'prod', label: 'Sentry errors, production' },
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
        points: buckets.map((label) => ({ label, value: null })),
      };
      if (!SENTRY_APPS.includes(app))
        return { ...empty, status: { kind: 'not-applicable', reason: NO_SENTRY_REASON } };
      if (reading.kind === 'unavailable') return { ...empty, status: reading };
      return {
        ...base,
        current: sumSentry(reading.value.rolling, app, definition.environment),
        points: buckets.map((label) => {
          const counts = reading.value.history.get(label);
          return {
            label,
            value: counts === undefined ? null : sumSentry(counts, app, definition.environment),
          };
        }),
        status: { kind: 'ok' },
      };
    }),
  );
}

export function buildSentryIssueIndicators(
  reading: SourceResult<readonly SentryIssueCount[]>,
  apps: readonly string[],
): readonly Indicator[] {
  return apps.map((app): Indicator => {
    const base = {
      id: 'sentry-issues-open',
      pillar: 'stability' as const,
      label: 'Sentry issues open',
      unit: 'count' as const,
      app,
      points: [],
    };
    if (!SENTRY_APPS.includes(app))
      return {
        ...base,
        current: null,
        status: { kind: 'not-applicable', reason: NO_SENTRY_REASON },
      };
    if (reading.kind === 'unavailable') return { ...base, current: null, status: reading };
    const own = reading.value.filter((count) => count.app === app);
    return {
      ...base,
      current: own.reduce((total, count) => total + count.count, 0),
      status: { kind: 'ok' },
    };
  });
}

export function buildBugReportIndicators(
  reading: SourceResult<readonly BugReport[]>,
  apps: readonly string[],
  range: RangeSpec,
  buckets: readonly string[],
): readonly Indicator[] {
  return apps.map((app): Indicator => {
    const base = {
      id: 'user-bug-reports-open',
      pillar: 'stability' as const,
      label: 'User bugs open',
      unit: 'count' as const,
      app,
    };
    const empty = {
      ...base,
      current: null,
      points: buckets.map((label) => ({ label, value: null })),
    };
    if (app !== BUG_REPORT_APP)
      return { ...empty, status: { kind: 'not-applicable', reason: NO_BUG_REPORTS_REASON } };
    if (reading.kind === 'unavailable') return { ...empty, status: reading };
    const open = reading.value.filter((report) => !CLOSED_IMPROVEMENT_STATUSES.has(report.status));
    return {
      ...base,
      current: open.length,
      points: buckets.map((label) => ({
        label,
        value:
          range.id === 'week'
            ? reading.value.filter(
                (report) => startOfWeek(report.createdAt.slice(0, ISO_DATE_LENGTH)) === label,
              ).length
            : null,
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
): Indicator {
  const isOk = reading.kind === 'ok';
  return {
    ...definition,
    pillar: 'security',
    unit: 'count',
    app: REPOSITORY_ROW,
    current: isOk ? reading.value : null,
    points: [],
    status: isOk ? { kind: 'ok' } : reading,
  };
}

function mapResult<Value, Mapped>(
  result: SourceResult<Value>,
  map: (value: Value) => Mapped,
): SourceResult<Mapped> {
  return result.kind === 'ok' ? { kind: 'ok', value: map(result.value) } : result;
}

export function buildSecurityIndicators(reading: SecurityReading): readonly Indicator[] {
  return [
    currentOnly(
      { id: 'dependabot-critical-high', label: 'Dependabot, critical or high' },
      mapResult(reading.dependabot, (counts) => counts.criticalOrHigh),
    ),
    currentOnly(
      { id: 'dependabot-other', label: 'Dependabot, moderate or low' },
      mapResult(reading.dependabot, (counts) => counts.other),
    ),
    currentOnly(
      { id: 'audit-critical-high', label: 'pnpm audit, critical or high' },
      mapResult(reading.audit, (counts) => counts.criticalOrHigh),
    ),
    currentOnly(
      { id: 'audit-other', label: 'pnpm audit, moderate or low' },
      mapResult(reading.audit, (counts) => counts.other),
    ),
    currentOnly(
      { id: 'secret-scanning-open', label: 'Secret scanning, open' },
      reading.secretScanning,
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

export interface SentrySnapshot {
  readonly week: SentryReading;
  readonly hour: SentryReading;
  readonly minute: SentryReading;
}

export interface Snapshot {
  readonly sentry: SourceResult<SentrySnapshot>;
  readonly sentryIssues: SourceResult<readonly SentryIssueCount[]>;
  readonly bugReports: SourceResult<readonly BugReport[]>;
  readonly dependabot: SourceResult<SecurityCounts>;
  readonly secretScanning: SourceResult<number>;
}

const NOT_COLLECTED: SourceResult<never> = { kind: 'unavailable', reason: 'not collected' };

export const EMPTY_SNAPSHOT: Snapshot = {
  sentry: NOT_COLLECTED,
  sentryIssues: NOT_COLLECTED,
  bugReports: NOT_COLLECTED,
  dependabot: NOT_COLLECTED,
  secretScanning: NOT_COLLECTED,
};

const unavailableSchema = z.object({ unavailable: z.string().min(1) }).strict();
const sentryCountSchema = z.object({
  app: z.string(),
  environment: z.string(),
  count: z.number().int().nonnegative(),
});
const securityCountsSchema = z.object({
  criticalOrHigh: z.number().int().nonnegative(),
  other: z.number().int().nonnegative(),
});
const improvementSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  status: z.string().min(1),
  kind: z.string().min(1),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
});
function sourceSchema<Schema extends z.ZodType>(schema: Schema) {
  return z.union([
    unavailableSchema.transform((raw): SourceResult<z.output<Schema>> => ({
      kind: 'unavailable',
      reason: raw.unavailable,
    })),
    schema.transform((value): SourceResult<z.output<Schema>> => ({ kind: 'ok', value })),
  ]);
}

const snapshotSchema = z.object({
  sentry: sourceSchema(
    z.object({
      rolling: z.array(sentryCountSchema),
      weekly: z.record(z.string(), z.array(sentryCountSchema)),
      hour: z.array(sentryCountSchema),
      minute: z.array(sentryCountSchema),
    }),
  ),
  sentryIssues: sourceSchema(
    z.array(z.object({ app: z.string(), count: z.number().int().nonnegative() })),
  ),
  improvements: sourceSchema(z.array(improvementSchema)),
  dependabot: sourceSchema(securityCountsSchema),
  secretScanning: sourceSchema(z.number().int().nonnegative()),
});

export function readSnapshot(raw: unknown): Snapshot {
  const snapshot = snapshotSchema.parse(raw);
  return {
    sentry: mapResult(snapshot.sentry, (sentry) => ({
      week: { rolling: sentry.rolling, history: new Map(Object.entries(sentry.weekly)) },
      hour: { rolling: sentry.hour, history: new Map() },
      minute: { rolling: sentry.minute, history: new Map() },
    })),
    sentryIssues: snapshot.sentryIssues,
    bugReports: mapResult(snapshot.improvements, (improvements) =>
      improvements
        .filter((improvement) => improvement.kind === BUG_KIND)
        .map(({ id, title, status, createdAt }) => ({ id, title, status, createdAt })),
    ),
    dependabot: snapshot.dependabot,
    secretScanning: snapshot.secretScanning,
  };
}
