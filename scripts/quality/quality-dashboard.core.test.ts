import { describe, expect, it } from 'vitest';
import {
  buildBugReportIndicators,
  buildGatewayIndicators,
  buildMetricQueries,
  buildSecurityIndicators,
  buildSentryIndicators,
  isEverySourceUnavailable,
  judgeAgainstTarget,
  listUnavailableSources,
  listWeekStarts,
  metricQueryId,
  placeBugReports,
  readAuditCounts,
  readBugReports,
  readDependabotCounts,
  readMetricSeries,
  readSentryCounts,
  readTargets,
  selectHttpApis,
  type HttpApi,
  type Indicator,
  type MetricSeries,
  type SourceResult,
} from './quality-dashboard.core';

const NOW = '2026-10-13';
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
const EMPTY_WEEKS = WEEKS.map((weekStart) => ({ weekStart, value: null }));
const UNAVAILABLE = { kind: 'unavailable', reason: 'token expired' } as const;
const PRAGMA_PROD: HttpApi = { app: 'pragma', stage: 'prod', apiId: 'ab-1' };
const PRAGMA_PREVIEW: HttpApi = { app: 'pragma', stage: 'preview', apiId: 'cd2' };
const PRAGMA_SECOND_PREVIEW: HttpApi = { app: 'pragma', stage: 'preview', apiId: 'ef3' };

function find(indicators: readonly Indicator[], id: string, app: string): Indicator | undefined {
  return indicators.find((indicator) => indicator.id === id && indicator.app === app);
}

function alert(severity: string): unknown {
  return { security_advisory: { severity } };
}

function speedIndicator(id: string, app: string, current: number | null): Indicator {
  return {
    id,
    pillar: 'speed',
    label: id,
    unit: 'ms',
    app,
    current,
    weeks: [],
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
    expect(buildMetricQueries([PRAGMA_PROD, PRAGMA_PREVIEW])).toEqual([
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
      rolling: [
        series('latencyP50_ab1', [['2026-10-06T09:00:00Z', 89.6]]),
        series('latencyP95_ab1', [['2026-10-06T09:00:00Z', 1391.2]]),
        series('serverErrors_ab1', [['2026-10-06T09:00:00Z', 20]]),
        series('serverErrors_cd2', [['2026-10-06T09:00:00Z', 2]]),
        series('serverErrors_ef3', [['2026-10-06T09:00:00Z', 3]]),
      ],
      weekly: [
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
    buildGatewayIndicators(reading, ['pragma', 'talos', 'borso-fr'], NOW);

  it('reports four indicators per application, in pillar order', () => {
    const indicators = buildDefault();
    expect(indicators.map((indicator) => `${indicator.app}:${indicator.id}`)).toEqual([
      'pragma:errors-preview',
      'pragma:errors-prod',
      'pragma:latency-p50',
      'pragma:latency-p95',
      'talos:errors-preview',
      'talos:errors-prod',
      'talos:latency-p50',
      'talos:latency-p95',
      'borso-fr:errors-preview',
      'borso-fr:errors-prod',
      'borso-fr:latency-p50',
      'borso-fr:latency-p95',
    ]);
  });

  it('sums the errors of every preview, and of production on its own', () => {
    const indicators = buildDefault();
    const previews = find(indicators, 'errors-preview', 'pragma');
    expect(previews).toMatchObject({
      pillar: 'stability',
      label: 'API 5xx on previews, 7 days',
      unit: 'count',
      current: 5,
      status: { kind: 'ok' },
    });
    expect(previews?.weeks.at(5)).toEqual({ weekStart: '2026-09-28', value: 6 });
    expect(previews?.weeks.at(0)).toEqual({ weekStart: '2026-08-24', value: 0 });
    const production = find(indicators, 'errors-prod', 'pragma');
    expect(production).toMatchObject({
      pillar: 'stability',
      label: 'API 5xx in production, 7 days',
      unit: 'count',
      current: 20,
    });
    expect(production?.weeks.at(7)).toEqual({ weekStart: '2026-10-12', value: 7 });
  });

  it('rounds latency to the millisecond and leaves a week with no data empty', () => {
    const indicators = buildDefault();
    const median = find(indicators, 'latency-p50', 'pragma');
    expect(median).toMatchObject({
      pillar: 'speed',
      label: 'API latency p50, 7 days',
      unit: 'ms',
      current: 90,
    });
    expect(median?.weeks.slice(6)).toEqual([
      { weekStart: '2026-10-05', value: 80 },
      { weekStart: '2026-10-12', value: 120 },
    ]);
    expect(median?.weeks.at(0)?.value).toBeNull();
    const tail = find(indicators, 'latency-p95', 'pragma');
    expect(tail).toMatchObject({
      pillar: 'speed',
      label: 'API latency p95, 7 days',
      unit: 'ms',
      current: 1391,
    });
    expect(tail?.weeks).toEqual(EMPTY_WEEKS);
  });

  it('keeps the slowest API when an application has two in production', () => {
    const twoApis = buildGatewayIndicators(
      {
        kind: 'ok',
        value: {
          apis: [PRAGMA_PROD, { app: 'pragma', stage: 'prod', apiId: 'zz' }],
          rolling: [
            series('latencyP50_ab1', [['2026-10-06T00:00:00Z', 40]]),
            series('latencyP50_zz', [['2026-10-06T00:00:00Z', 70]]),
          ],
          weekly: [],
        },
      },
      ['pragma'],
      NOW,
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
      label: 'API 5xx on previews, 7 days',
      unit: 'count',
      app: 'talos',
      current: null,
      weeks: EMPTY_WEEKS,
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
    const failed = buildGatewayIndicators(UNAVAILABLE, ['pragma', 'borso-fr'], NOW);
    expect(find(failed, 'latency-p95', 'pragma')).toMatchObject({
      current: null,
      weeks: EMPTY_WEEKS,
      status: UNAVAILABLE,
    });
    expect(find(failed, 'latency-p95', 'borso-fr')?.status.kind).toBe('not-applicable');
  });
});

describe('Sentry', () => {
  it('reads the project, the environment and the count of each row', () => {
    expect(
      readSentryCounts({
        data: [
          { project: 'pragma', environment: 'prod', 'count()': 3 },
          { project: 'pragma', environment: null, 'count()': 1 },
        ],
      }),
    ).toEqual([
      { project: 'pragma', environment: 'prod', count: 3 },
      { project: 'pragma', environment: '', count: 1 },
    ]);
    expect(() => readSentryCounts({ rows: [] })).toThrow();
  });

  const reading = {
    kind: 'ok',
    value: {
      rolling: [
        { project: 'pragma', environment: 'prod', count: 3 },
        { project: 'pragma', environment: 'prod', count: 2 },
        { project: 'pragma', environment: 'preview', count: 4 },
        { project: 'last-loop-lepin', environment: 'prod', count: 9 },
      ],
      weekly: new Map([['2026-10-05', [{ project: 'pragma', environment: 'prod', count: 6 }]]]),
    },
  } as const;

  it('counts each application per environment, week by week', () => {
    const indicators = buildSentryIndicators(reading, ['pragma', 'banana-rush'], NOW);
    expect(find(indicators, 'sentry-errors-prod', 'pragma')).toMatchObject({
      pillar: 'stability',
      label: 'Sentry errors in production, 7 days',
      unit: 'count',
      current: 5,
      status: { kind: 'ok' },
    });
    expect(find(indicators, 'sentry-errors-prod', 'pragma')?.weeks.slice(6)).toEqual([
      { weekStart: '2026-10-05', value: 6 },
      { weekStart: '2026-10-12', value: null },
    ]);
    expect(find(indicators, 'sentry-errors-preview', 'pragma')).toMatchObject({
      label: 'Sentry errors on previews, 7 days',
      current: 4,
    });
    expect(find(indicators, 'sentry-errors-preview', 'banana-rush')).toEqual({
      id: 'sentry-errors-preview',
      pillar: 'stability',
      label: 'Sentry errors on previews, 7 days',
      unit: 'count',
      app: 'banana-rush',
      current: null,
      weeks: EMPTY_WEEKS,
      status: { kind: 'not-applicable', reason: 'Sentry not connected' },
    });
  });

  it('passes an unavailable source through', () => {
    const indicators = buildSentryIndicators(UNAVAILABLE, ['last-loop-lepin'], NOW);
    expect(indicators.map((indicator) => indicator.status)).toEqual([UNAVAILABLE, UNAVAILABLE]);
    expect(indicators.every((indicator) => indicator.current === null)).toBe(true);
  });
});

describe('bug reports', () => {
  const csv =
    'id-1\tidea\t2026-10-06T10:00:00Z\tThe setlist\tfreezes\n\nid-2\tshipped\t2026-09-30T08:00:00Z\tLogin loops\n id-3\tplanned\t2026-10-12T08:00:00Z\tA\n';

  it('reads one report per line and keeps a title that held a tab', () => {
    const reports = readBugReports(csv);
    expect(reports).toEqual([
      {
        id: 'id-1',
        status: 'idea',
        createdAt: '2026-10-06T10:00:00Z',
        title: 'The setlist\tfreezes',
      },
      { id: 'id-2', status: 'shipped', createdAt: '2026-09-30T08:00:00Z', title: 'Login loops' },
      { id: 'id-3', status: 'planned', createdAt: '2026-10-12T08:00:00Z', title: 'A' },
    ]);
  });

  it('refuses a line without an id, a status or a date', () => {
    expect(() => readBugReports('\tidea\t2026-10-06T10:00:00Z\tx')).toThrow();
    expect(() => readBugReports('id\t\t2026-10-06T10:00:00Z\tx')).toThrow();
    expect(() => readBugReports('id\tidea\tyesterday\tx')).toThrow();
    expect(() => readBugReports('id\tidea\tx2026-10-06\tx')).toThrow();
    expect(() => readBugReports('id\tidea\t2026-10-6T10\tx')).toThrow();
  });

  it('counts the open reports, and the reports filed each week', () => {
    const reports = readBugReports(csv);
    const indicators = buildBugReportIndicators(
      { kind: 'ok', value: reports },
      ['pragma', 'talos'],
      NOW,
    );
    const pragma = find(indicators, 'user-bug-reports-open', 'pragma');
    expect(pragma).toMatchObject({
      pillar: 'stability',
      label: 'Bug reports from users, open',
      unit: 'count',
      current: 2,
      status: { kind: 'ok' },
    });
    expect(pragma?.weeks.slice(5)).toEqual([
      { weekStart: '2026-09-28', value: 1 },
      { weekStart: '2026-10-05', value: 1 },
      { weekStart: '2026-10-12', value: 1 },
    ]);
    expect(find(indicators, 'user-bug-reports-open', 'talos')).toMatchObject({
      current: null,
      weeks: EMPTY_WEEKS,
      status: { kind: 'not-applicable', reason: 'bug reports are collected in pragma only' },
    });
  });

  it('treats a declined report as closed, and passes an unavailable source through', () => {
    const declined = buildBugReportIndicators(
      { kind: 'ok', value: [{ id: 'x', status: 'declined', createdAt: '2026-10-06', title: 't' }] },
      ['pragma'],
      NOW,
    );
    expect(declined.at(0)?.current).toBe(0);
    expect(buildBugReportIndicators(UNAVAILABLE, ['pragma'], NOW).at(0)).toMatchObject({
      current: null,
      status: UNAVAILABLE,
    });
  });

  it('places each report as a stage E dot on pragma', () => {
    const reports = readBugReports(csv);
    expect(placeBugReports(reports.slice(0, 1))).toEqual([
      {
        slug: 'improvement-id-1',
        title: 'Bug report: The setlist\tfreezes',
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

describe('security', () => {
  it('splits Dependabot alerts into critical or high, and the rest', () => {
    expect(
      readDependabotCounts([alert('critical'), alert('high'), alert('medium'), alert('low')]),
    ).toEqual({ criticalOrHigh: 2, other: 2 });
    expect(() => readDependabotCounts([{}])).toThrow();
  });

  it('splits the audit the same way', () => {
    expect(
      readAuditCounts({
        metadata: { vulnerabilities: { info: 1, low: 2, moderate: 3, high: 4, critical: 5 } },
      }),
    ).toEqual({ criticalOrHigh: 9, other: 6 });
    expect(() => readAuditCounts({ advisories: {} })).toThrow();
  });

  it('reports five repository rows with no trend', () => {
    const indicators = buildSecurityIndicators(
      {
        dependabot: { kind: 'ok', value: { criticalOrHigh: 1, other: 2 } },
        audit: UNAVAILABLE,
        secretScanning: { kind: 'ok', value: 0 },
      },
      NOW,
    );
    expect(
      indicators.map((indicator) => [indicator.id, indicator.label, indicator.current]),
    ).toEqual([
      ['dependabot-critical-high', 'Dependabot alerts, critical or high', 1],
      ['dependabot-other', 'Dependabot alerts, moderate or low', 2],
      ['audit-critical-high', 'pnpm audit, critical or high', null],
      ['audit-other', 'pnpm audit, moderate or lower', null],
      ['secret-scanning-open', 'Secret scanning alerts, open', 0],
    ]);
    expect(indicators.at(0)).toMatchObject({
      pillar: 'security',
      unit: 'count',
      app: 'repository',
      weeks: EMPTY_WEEKS,
      status: { kind: 'ok' },
    });
    expect(indicators.at(2)?.status).toEqual(UNAVAILABLE);
  });
});

describe('security with every source read', () => {
  it('reads both halves of the audit', () => {
    const indicators = buildSecurityIndicators(
      {
        dependabot: UNAVAILABLE,
        audit: { kind: 'ok', value: { criticalOrHigh: 42, other: 46 } },
        secretScanning: UNAVAILABLE,
      },
      NOW,
    );
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
