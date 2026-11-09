import { describe, expect, it } from 'vitest';
import {
  EMPTY_SNAPSHOT,
  RANGES,
  SECONDS_PER_WEEK,
  bucketOf,
  buildBugReportIndicators,
  buildGatewayIndicators,
  buildMetricQueries,
  buildSecurityIndicators,
  buildSentryIndicators,
  buildSentryIssueIndicators,
  isEverySourceUnavailable,
  judgeAgainstTarget,
  listBuckets,
  listUnavailableSources,
  listWeekStarts,
  metricQueryId,
  placeBugReports,
  readAuditCounts,
  readMetricSeries,
  readSnapshot,
  readTargets,
  selectHttpApis,
  type HttpApi,
  type Indicator,
  type RangeSpec,
  type MetricSeries,
  type SourceResult,
} from './quality-dashboard.core';

const NOW = '2026-10-13';
const WEEK_RANGE: RangeSpec = RANGES.find((range) => range.id === 'week')!;
const WEEK_BUCKETS = listWeekStarts(NOW);
const WEEKS = [
  '2026-08-24',
  '2026-08-31',
  '2026-09-07',
  '2026-09-14',
  '2026-09-21',
  '2026-09-28',
  '2026-10-05',
  '2026-10-12',
];
const EMPTY_WEEKS = WEEKS.map((label) => ({ label, value: null }));
const UNAVAILABLE = { kind: 'unavailable', reason: 'token expired' } as const;
const PRAGMA_PROD: HttpApi = { app: 'pragma', stage: 'prod', apiId: 'ab-1' };
const PRAGMA_PREVIEW: HttpApi = { app: 'pragma', stage: 'preview', apiId: 'cd2' };
const PRAGMA_SECOND_PREVIEW: HttpApi = { app: 'pragma', stage: 'preview', apiId: 'ef3' };

function find(indicators: readonly Indicator[], id: string, app: string): Indicator | undefined {
  return indicators.find((indicator) => indicator.id === id && indicator.app === app);
}

function speedIndicator(id: string, app: string, current: number | null): Indicator {
  return {
    id,
    pillar: 'speed',
    label: id,
    unit: 'ms',
    app,
    current,
    points: [],
    status: { kind: 'ok' },
  };
}

describe('listWeekStarts', () => {
  it('lists the eight Mondays ending with the current week, oldest first', () => {
    expect(listWeekStarts(NOW)).toEqual(WEEKS);
    expect(listWeekStarts('2026-10-12')).toEqual(WEEKS);
    expect(listWeekStarts('2026-10-18')).toEqual(WEEKS);
  });
});

describe('selectHttpApis', () => {
  it('keeps the HTTP APIs named after an application and a stage', () => {
    expect(
      selectHttpApis([
        { Name: 'pragma-prod-api', ApiId: 'a1', ProtocolType: 'HTTP' },
        { Name: 'last-loop-lepin-preview-api', ApiId: 'b2', ProtocolType: 'HTTP' },
        { Name: 'banana-rush-prod-websocket', ApiId: 'c3', ProtocolType: 'WEBSOCKET' },
        { Name: 'banana-rush-prod-api', ApiId: 'd4', ProtocolType: 'WEBSOCKET' },
        { Name: 'something-else', ApiId: 'e5', ProtocolType: 'HTTP' },
        { Name: 'pragma-integ-api', ApiId: 'f6', ProtocolType: 'HTTP' },
        { Name: 'no id' },
        null,
      ]),
    ).toEqual([
      { app: 'pragma', stage: 'prod', apiId: 'a1' },
      { app: 'last-loop-lepin', stage: 'preview', apiId: 'b2' },
    ]);
  });
});

describe('buildMetricQueries', () => {
  it('asks latency and errors for production, and errors only for a preview', () => {
    expect(buildMetricQueries([PRAGMA_PROD, PRAGMA_PREVIEW], SECONDS_PER_WEEK)).toEqual([
      {
        Id: 'latencyP50_ab1',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApiGateway',
            MetricName: 'Latency',
            Dimensions: [{ Name: 'ApiId', Value: 'ab-1' }],
          },
          Period: 604_800,
          Stat: 'p50',
        },
      },
      {
        Id: 'latencyP95_ab1',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApiGateway',
            MetricName: 'Latency',
            Dimensions: [{ Name: 'ApiId', Value: 'ab-1' }],
          },
          Period: 604_800,
          Stat: 'p95',
        },
      },
      {
        Id: 'serverErrors_ab1',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApiGateway',
            MetricName: '5xx',
            Dimensions: [{ Name: 'ApiId', Value: 'ab-1' }],
          },
          Period: 604_800,
          Stat: 'Sum',
        },
      },
      {
        Id: 'throttles_ab1',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/Lambda',
            MetricName: 'Throttles',
            Dimensions: [{ Name: 'FunctionName', Value: 'pragma-prod-api' }],
          },
          Period: 604_800,
          Stat: 'Sum',
        },
      },
      {
        Id: 'serverErrors_cd2',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/ApiGateway',
            MetricName: '5xx',
            Dimensions: [{ Name: 'ApiId', Value: 'cd2' }],
          },
          Period: 604_800,
          Stat: 'Sum',
        },
      },
    ]);
  });

  it('builds an identifier CloudWatch accepts from any API id', () => {
    expect(metricQueryId({ app: 'x', stage: 'prod', apiId: 'A_b-c.9' }, 'latencyP95')).toBe(
      'latencyP95_Abc9',
    );
  });
});

describe('readMetricSeries', () => {
  it('pairs each timestamp with its value, and reads a missing value as zero', () => {
    expect(
      readMetricSeries({
        MetricDataResults: [
          { Id: 'q', Timestamps: ['2026-10-05T00:00:00Z', '2026-10-12T00:00:00Z'], Values: [4] },
        ],
      }),
    ).toEqual([
      {
        id: 'q',
        points: [
          { timestamp: '2026-10-05T00:00:00Z', value: 4 },
          { timestamp: '2026-10-12T00:00:00Z', value: 0 },
        ],
      },
    ]);
  });

  it('refuses a response of another shape', () => {
    expect(() => readMetricSeries({ Results: [] })).toThrow();
  });
});

function series(id: string, points: readonly (readonly [string, number])[]): MetricSeries {
  return { id, points: points.map(([timestamp, value]) => ({ timestamp, value })) };
}

describe('buildGatewayIndicators', () => {
  const reading = {
    kind: 'ok',
    value: {
      apis: [PRAGMA_PROD, PRAGMA_PREVIEW, PRAGMA_SECOND_PREVIEW],
      current: [
        series('latencyP50_ab1', [['2026-10-06T09:00:00Z', 89.6]]),
        series('latencyP95_ab1', [['2026-10-06T09:00:00Z', 1391.2]]),
        series('serverErrors_ab1', [['2026-10-06T09:00:00Z', 20]]),
        series('serverErrors_cd2', [['2026-10-06T09:00:00Z', 2]]),
        series('serverErrors_ef3', [['2026-10-06T09:00:00Z', 3]]),
        series('throttles_ab1', [['2026-10-06T09:00:00Z', 545]]),
      ],
      buckets: [
        series('latencyP50_ab1', [
          ['2026-10-05T00:00:00Z', 80.4],
          ['2026-10-12T00:00:00Z', 120],
        ]),
        series('latencyP95_ab1', []),
        series('serverErrors_ab1', [['2026-10-12T00:00:00Z', 7]]),
        series('serverErrors_cd2', [['2026-09-28T00:00:00Z', 1]]),
        series('serverErrors_ef3', [['2026-09-28T00:00:00Z', 5]]),
      ],
    },
  } as const;
  const buildDefault = (): readonly Indicator[] =>
    buildGatewayIndicators(reading, ['pragma', 'talos', 'borso-fr'], WEEK_RANGE, WEEK_BUCKETS);

  it('reports five indicators per application, in pillar order', () => {
    const indicators = buildDefault();
    expect(indicators.map((indicator) => `${indicator.app}:${indicator.id}`)).toEqual([
      'pragma:errors-preview',
      'pragma:errors-prod',
      'pragma:throttles-prod',
      'pragma:latency-p50',
      'pragma:latency-p95',
      'talos:errors-preview',
      'talos:errors-prod',
      'talos:throttles-prod',
      'talos:latency-p50',
      'talos:latency-p95',
      'borso-fr:errors-preview',
      'borso-fr:errors-prod',
      'borso-fr:throttles-prod',
      'borso-fr:latency-p50',
      'borso-fr:latency-p95',
    ]);
  });

  it('sums the errors of every preview, and of production on its own', () => {
    const indicators = buildDefault();
    const previews = find(indicators, 'errors-preview', 'pragma');
    expect(previews).toMatchObject({
      pillar: 'stability',
      label: 'Failed requests, previews',
      unit: 'count',
      current: 5,
      status: { kind: 'ok' },
    });
    expect(previews?.points.at(5)).toEqual({ label: '2026-09-28', value: 6 });
    expect(previews?.points.at(0)).toEqual({ label: '2026-08-24', value: 0 });
    const production = find(indicators, 'errors-prod', 'pragma');
    expect(production).toMatchObject({
      pillar: 'stability',
      label: 'Failed requests, production',
      unit: 'count',
      current: 20,
    });
    expect(production?.points.at(7)).toEqual({ label: '2026-10-12', value: 7 });
  });

  it('sums the throttled calls of production', () => {
    const indicators = buildDefault();
    expect(find(indicators, 'throttles-prod', 'pragma')).toMatchObject({
      pillar: 'stability',
      label: 'Throttled requests, production',
      unit: 'count',
      current: 545,
    });
  });

  it('rounds latency to the millisecond and leaves a week with no data empty', () => {
    const indicators = buildDefault();
    const median = find(indicators, 'latency-p50', 'pragma');
    expect(median).toMatchObject({
      pillar: 'speed',
      label: 'p50',
      unit: 'ms',
      current: 90,
    });
    expect(median?.points.slice(6)).toEqual([
      { label: '2026-10-05', value: 80 },
      { label: '2026-10-12', value: 120 },
    ]);
    expect(median?.points.at(0)?.value).toBeNull();
    const tail = find(indicators, 'latency-p95', 'pragma');
    expect(tail).toMatchObject({
      pillar: 'speed',
      label: 'p95',
      unit: 'ms',
      current: 1391,
    });
    expect(tail?.points).toEqual(EMPTY_WEEKS);
  });

  it('keeps the slowest API when an application has two in production', () => {
    const twoApis = buildGatewayIndicators(
      {
        kind: 'ok',
        value: {
          apis: [PRAGMA_PROD, { app: 'pragma', stage: 'prod', apiId: 'zz' }],
          current: [
            series('latencyP50_ab1', [['2026-10-06T00:00:00Z', 40]]),
            series('latencyP50_zz', [['2026-10-06T00:00:00Z', 70]]),
          ],
          buckets: [],
        },
      },
      ['pragma'],
      WEEK_RANGE,
      WEEK_BUCKETS,
    );
    expect(find(twoApis, 'latency-p50', 'pragma')?.current).toBe(70);
    expect(find(twoApis, 'errors-prod', 'pragma')?.current).toBe(0);
    expect(find(twoApis, 'latency-p95', 'pragma')?.current).toBeNull();
  });

  it('says no preview is deployed, and no API exists, rather than zero', () => {
    const indicators = buildDefault();
    expect(find(indicators, 'errors-preview', 'talos')).toEqual({
      id: 'errors-preview',
      pillar: 'stability',
      label: 'Failed requests, previews',
      unit: 'count',
      app: 'talos',
      current: null,
      points: EMPTY_WEEKS,
      status: { kind: 'not-applicable', reason: 'no preview deployed' },
    });
    expect(find(indicators, 'latency-p50', 'talos')?.status).toEqual({
      kind: 'not-applicable',
      reason: 'no production API deployed',
    });
    expect(find(indicators, 'errors-prod', 'borso-fr')?.status).toEqual({
      kind: 'not-applicable',
      reason: 'no API',
    });
  });

  it('passes an unavailable source through to every full-stack cell', () => {
    const failed = buildGatewayIndicators(
      UNAVAILABLE,
      ['pragma', 'borso-fr'],
      WEEK_RANGE,
      WEEK_BUCKETS,
    );
    expect(find(failed, 'latency-p95', 'pragma')).toMatchObject({
      current: null,
      points: EMPTY_WEEKS,
      status: UNAVAILABLE,
    });
    expect(find(failed, 'latency-p95', 'borso-fr')?.status.kind).toBe('not-applicable');
  });
});

describe('ranges', () => {
  const hourRange = RANGES.find((range) => range.id === 'hour');
  const minuteRange = RANGES.find((range) => range.id === 'minute');

  it('names the three ranges the board offers', () => {
    expect(RANGES.map((range) => [range.id, range.title, range.buckets])).toEqual([
      ['week', 'week by week', 8],
      ['hour', 'last 12 hours', 12],
      ['minute', 'last 60 minutes', 60],
    ]);
  });

  it('lists a bucket per week, per hour and per minute, oldest first', () => {
    const clock = new Date('2026-10-13T14:37:42Z');
    expect(listBuckets(WEEK_RANGE, clock)).toEqual(WEEKS);
    const hours = listBuckets(hourRange!, clock);
    expect(hours.length).toBe(12);
    expect(hours.at(0)).toBe('03:00');
    expect(hours.at(-1)).toBe('14:00');
    const minutes = listBuckets(minuteRange!, clock);
    expect(minutes.length).toBe(60);
    expect(minutes.at(0)).toBe('13:38');
    expect(minutes.at(-1)).toBe('14:37');
  });

  it('places a timestamp in the bucket that holds it', () => {
    expect(bucketOf(WEEK_RANGE, '2026-10-14T09:12:00Z')).toBe('2026-10-12');
    expect(bucketOf(hourRange!, '2026-10-13T14:59:59Z')).toBe('14:00');
    expect(bucketOf(minuteRange!, '2026-10-13T14:37:59Z')).toBe('14:37');
  });

  it('asks CloudWatch for the period the range buckets by', () => {
    expect(buildMetricQueries([PRAGMA_PROD], 60).at(0)?.MetricStat.Period).toBe(60);
  });
});

describe('Sentry', () => {
  const reading = {
    kind: 'ok',
    value: {
      rolling: [
        { app: 'pragma', environment: 'prod', count: 3 },
        { app: 'pragma', environment: 'prod', count: 2 },
        { app: 'pragma', environment: 'preview', count: 4 },
        { app: 'last-loop-lepin', environment: 'prod', count: 9 },
      ],
      history: new Map([['2026-10-05', [{ app: 'pragma', environment: 'prod', count: 6 }]]]),
    },
  } as const;

  it('counts each application per environment, week by week', () => {
    const indicators = buildSentryIndicators(reading, ['pragma', 'other-app'], WEEK_BUCKETS);
    expect(find(indicators, 'sentry-errors-prod', 'pragma')).toMatchObject({
      pillar: 'stability',
      label: 'Errors raised, production',
      unit: 'count',
      current: 5,
      status: { kind: 'ok' },
    });
    expect(find(indicators, 'sentry-errors-prod', 'pragma')?.points.slice(6)).toEqual([
      { label: '2026-10-05', value: 6 },
      { label: '2026-10-12', value: null },
    ]);
    expect(find(indicators, 'sentry-errors-preview', 'pragma')).toMatchObject({
      label: 'Errors raised, previews',
      current: 4,
    });
    expect(find(indicators, 'sentry-errors-preview', 'other-app')).toEqual({
      id: 'sentry-errors-preview',
      pillar: 'stability',
      label: 'Errors raised, previews',
      unit: 'count',
      app: 'other-app',
      current: null,
      points: EMPTY_WEEKS,
      status: { kind: 'not-applicable', reason: 'no Sentry' },
    });
  });

  it('passes an unavailable source through', () => {
    const indicators = buildSentryIndicators(UNAVAILABLE, ['pragma'], WEEK_BUCKETS);
    expect(indicators.map((indicator) => indicator.status)).toEqual([UNAVAILABLE, UNAVAILABLE]);
    expect(indicators.every((indicator) => indicator.current === null)).toBe(true);
  });
});

const REPORTS = [
  { id: 'id-1', status: 'idea', createdAt: '2026-10-06T10:00:00Z', title: 'The setlist freezes' },
  { id: 'id-2', status: 'shipped', createdAt: '2026-09-30T08:00:00Z', title: 'Login loops' },
  { id: 'id-3', status: 'planned', createdAt: '2026-10-12T08:00:00Z', title: 'A' },
];

describe('Sentry issues', () => {
  it('counts the open issues of each application, and skips an app with no Sentry', () => {
    const indicators = buildSentryIssueIndicators(
      {
        kind: 'ok',
        value: [
          { app: 'pragma', count: 5 },
          { app: 'pragma', count: 1 },
        ],
      },
      ['pragma', 'talos', 'nowhere'],
    );
    expect(find(indicators, 'sentry-issues-open', 'pragma')).toEqual({
      id: 'sentry-issues-open',
      pillar: 'stability',
      label: 'Error groups open',
      unit: 'count',
      app: 'pragma',
      points: [],
      current: 6,
      status: { kind: 'ok' },
    });
    expect(find(indicators, 'sentry-issues-open', 'talos')?.current).toBe(0);
    expect(find(indicators, 'sentry-issues-open', 'nowhere')).toMatchObject({
      current: null,
      status: { kind: 'not-applicable', reason: 'no Sentry' },
    });
  });

  it('passes an unavailable source through', () => {
    expect(buildSentryIssueIndicators(UNAVAILABLE, ['pragma']).at(0)).toMatchObject({
      current: null,
      status: UNAVAILABLE,
    });
  });
});

describe('bug reports', () => {
  it('counts the open reports, and the reports filed each week', () => {
    const indicators = buildBugReportIndicators(
      { kind: 'ok', value: REPORTS },
      ['pragma', 'talos'],
      WEEK_RANGE,
      WEEK_BUCKETS,
    );
    const pragma = find(indicators, 'user-bug-reports-open', 'pragma');
    expect(pragma).toMatchObject({
      pillar: 'stability',
      label: 'User bugs open',
      unit: 'count',
      current: 2,
      status: { kind: 'ok' },
    });
    expect(pragma?.points.slice(5)).toEqual([
      { label: '2026-09-28', value: 1 },
      { label: '2026-10-05', value: 1 },
      { label: '2026-10-12', value: 1 },
    ]);
    expect(find(indicators, 'user-bug-reports-open', 'talos')).toMatchObject({
      current: null,
      points: EMPTY_WEEKS,
      status: { kind: 'not-applicable', reason: 'pragma only' },
    });
  });

  it('treats a declined report as closed, and passes an unavailable source through', () => {
    const declined = buildBugReportIndicators(
      { kind: 'ok', value: [{ id: 'x', status: 'declined', createdAt: '2026-10-06', title: 't' }] },
      ['pragma'],
      WEEK_RANGE,
      WEEK_BUCKETS,
    );
    expect(declined.at(0)?.current).toBe(0);
    expect(
      buildBugReportIndicators(UNAVAILABLE, ['pragma'], WEEK_RANGE, WEEK_BUCKETS).at(0),
    ).toMatchObject({
      current: null,
      status: UNAVAILABLE,
    });
  });

  it('leaves the history empty outside the week range', () => {
    const hourRange = RANGES.find((range) => range.id === 'hour');
    const hourly = buildBugReportIndicators(
      { kind: 'ok', value: REPORTS },
      ['pragma'],
      hourRange!,
      ['14:00', '15:00'],
    );
    expect(hourly.at(0)?.current).toBe(2);
    expect(hourly.at(0)?.points).toEqual([
      { label: '14:00', value: null },
      { label: '15:00', value: null },
    ]);
  });

  it('places each report as a stage E dot on pragma', () => {
    expect(placeBugReports(REPORTS.slice(0, 1))).toEqual([
      {
        slug: 'improvement-id-1',
        title: 'Bug report: The setlist freezes',
        date: '2026-10-06',
        zone: 'apps/pragma',
        weakPoint: null,
        recurs: [],
        stage: 'E',
        link: 'https://pragma.borso.fr/improvements',
      },
    ]);
  });
});

describe('readSnapshot', () => {
  const improvement = {
    id: 'id-1',
    title: 'Deezer link broken',
    status: 'idea',
    kind: 'bug',
    createdAt: '2026-10-06T10:00:00Z',
  };

  it('reads every source a session collected, and keeps only the bug reports', () => {
    const snapshot = readSnapshot({
      sentry: {
        rolling: [{ app: 'pragma', environment: 'prod', count: 3 }],
        weekly: { '2026-10-05': [{ app: 'pragma', environment: 'prod', count: 2 }] },
        hour: [{ app: 'pragma', environment: 'prod', count: 1 }],
        minute: [],
      },
      sentryIssues: [{ app: 'pragma', count: 5 }],
      improvements: [improvement, { ...improvement, id: 'id-2', kind: 'idea' }],
      dependabot: { criticalOrHigh: 1, other: 0 },
      secretScanning: 0,
    });
    expect(snapshot.sentry).toEqual({
      kind: 'ok',
      value: {
        week: {
          rolling: [{ app: 'pragma', environment: 'prod', count: 3 }],
          history: new Map([['2026-10-05', [{ app: 'pragma', environment: 'prod', count: 2 }]]]),
        },
        hour: { rolling: [{ app: 'pragma', environment: 'prod', count: 1 }], history: new Map() },
        minute: { rolling: [], history: new Map() },
      },
    });
    expect(snapshot.bugReports).toEqual({
      kind: 'ok',
      value: [
        {
          id: 'id-1',
          title: 'Deezer link broken',
          status: 'idea',
          createdAt: '2026-10-06T10:00:00Z',
        },
      ],
    });
    expect(snapshot.sentryIssues).toEqual({ kind: 'ok', value: [{ app: 'pragma', count: 5 }] });
    expect(snapshot.dependabot).toEqual({ kind: 'ok', value: { criticalOrHigh: 1, other: 0 } });
    expect(snapshot.secretScanning).toEqual({ kind: 'ok', value: 0 });
  });

  it('reads a source the session could not collect as unavailable, with its reason', () => {
    const unavailable = { unavailable: 'disabled on the repository' };
    expect(
      readSnapshot({
        sentry: unavailable,
        sentryIssues: unavailable,
        improvements: unavailable,
        dependabot: unavailable,
        secretScanning: unavailable,
      }),
    ).toEqual({
      sentry: { kind: 'unavailable', reason: 'disabled on the repository' },
      sentryIssues: { kind: 'unavailable', reason: 'disabled on the repository' },
      bugReports: { kind: 'unavailable', reason: 'disabled on the repository' },
      dependabot: { kind: 'unavailable', reason: 'disabled on the repository' },
      secretScanning: { kind: 'unavailable', reason: 'disabled on the repository' },
    });
  });

  it('refuses a snapshot a session got wrong rather than drawing it', () => {
    const valid = {
      sentry: { unavailable: 'x' },
      sentryIssues: { unavailable: 'x' },
      improvements: [improvement],
      dependabot: { unavailable: 'x' },
      secretScanning: 0,
    };
    expect(() => readSnapshot({ ...valid, secretScanning: -1 })).toThrow();
    expect(() => readSnapshot({ ...valid, sentry: { unavailable: '' } })).toThrow();
    expect(() =>
      readSnapshot({
        ...valid,
        sentry: { unavailable: 'x', rolling: [], weekly: {}, hour: [], minute: [] },
      }),
    ).not.toThrow();
    expect(() =>
      readSnapshot({ ...valid, improvements: [{ ...improvement, createdAt: 'x2026-10-06' }] }),
    ).toThrow();
    expect(() =>
      readSnapshot({ ...valid, improvements: [{ ...improvement, createdAt: '2026-10-6' }] }),
    ).toThrow();
    expect(() => readSnapshot({ ...valid, improvements: [{ ...improvement, id: '' }] })).toThrow();
    expect(() =>
      readSnapshot({ ...valid, dependabot: { criticalOrHigh: 1.5, other: 0 } }),
    ).toThrow();
  });

  it('starts empty, with every session source not collected', () => {
    const notCollected = { kind: 'unavailable', reason: 'not collected' };
    expect(EMPTY_SNAPSHOT).toEqual({
      sentry: notCollected,
      sentryIssues: notCollected,
      bugReports: notCollected,
      dependabot: notCollected,
      secretScanning: notCollected,
    });
  });
});

describe('security', () => {
  it('splits the audit the same way', () => {
    expect(
      readAuditCounts({
        metadata: { vulnerabilities: { info: 1, low: 2, moderate: 3, high: 4, critical: 5 } },
      }),
    ).toEqual({ criticalOrHigh: 9, other: 6 });
    expect(() => readAuditCounts({ advisories: {} })).toThrow();
  });

  it('reports five repository rows with no trend', () => {
    const indicators = buildSecurityIndicators({
      dependabot: { kind: 'ok', value: { criticalOrHigh: 1, other: 2 } },
      audit: UNAVAILABLE,
      secretScanning: { kind: 'ok', value: 0 },
    });
    expect(
      indicators.map((indicator) => [indicator.id, indicator.label, indicator.current]),
    ).toEqual([
      ['dependabot-critical-high', 'Dependabot, critical or high', 1],
      ['dependabot-other', 'Dependabot, moderate or low', 2],
      ['audit-critical-high', 'pnpm audit, critical or high', null],
      ['audit-other', 'pnpm audit, moderate or low', null],
      ['secret-scanning-open', 'Secret scanning, open', 0],
    ]);
    expect(indicators.at(0)).toMatchObject({
      pillar: 'security',
      unit: 'count',
      app: 'repository',
      points: [],
      status: { kind: 'ok' },
    });
    expect(indicators.at(2)?.status).toEqual(UNAVAILABLE);
  });
});

describe('security with every source read', () => {
  it('reads both halves of the audit', () => {
    const indicators = buildSecurityIndicators({
      dependabot: UNAVAILABLE,
      audit: { kind: 'ok', value: { criticalOrHigh: 42, other: 46 } },
      secretScanning: UNAVAILABLE,
    });
    expect(indicators.map((indicator) => indicator.current)).toEqual([null, null, 42, 46, null]);
  });
});

describe('targets', () => {
  const targets = readTargets(
    '| Indicator | App | Ceiling |\n| --- | --- | --- |\n| `latency-p95` | pragma | 1500 |\n| `errors-prod` | talos | 0 |\n| latency-p50 | pragma | 10 |\n',
  );

  it('reads one target per row that names an indicator in backticks', () => {
    expect(targets).toEqual([
      { indicatorId: 'latency-p95', app: 'pragma', ceiling: 1500 },
      { indicatorId: 'errors-prod', app: 'talos', ceiling: 0 },
    ]);
  });

  it('judges a value at its ceiling as within, above it as over, and no target as none', () => {
    expect(judgeAgainstTarget(speedIndicator('latency-p95', 'pragma', 1500), targets)).toBe(
      'within',
    );
    expect(judgeAgainstTarget(speedIndicator('latency-p95', 'pragma', 1501), targets)).toBe('over');
    expect(judgeAgainstTarget(speedIndicator('latency-p95', 'talos', 9000), targets)).toBe('none');
    expect(judgeAgainstTarget(speedIndicator('errors-prod', 'pragma', 9), targets)).toBe('none');
    expect(judgeAgainstTarget(speedIndicator('errors-prod', 'talos', null), targets)).toBe('none');
  });
});

describe('source outcomes', () => {
  const ok: SourceResult<number> = { kind: 'ok', value: 1 };

  it('names each unavailable source with its reason', () => {
    expect(
      listUnavailableSources(
        new Map<string, SourceResult<unknown>>([
          ['CloudWatch', ok],
          ['Sentry', UNAVAILABLE],
        ]),
      ),
    ).toEqual(['Sentry: token expired']);
  });

  it('fails the run only when every source failed', () => {
    expect(isEverySourceUnavailable(new Map([['a', UNAVAILABLE]]))).toBe(true);
    expect(
      isEverySourceUnavailable(
        new Map<string, SourceResult<unknown>>([
          ['a', UNAVAILABLE],
          ['b', ok],
        ]),
      ),
    ).toBe(false);
    expect(isEverySourceUnavailable(new Map())).toBe(false);
  });
});
