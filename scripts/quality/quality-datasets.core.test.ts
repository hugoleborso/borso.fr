import { describe, expect, it } from 'vitest';
import type { Indicator } from './quality-dashboard.core';
import {
  buildBucketRows,
  buildDefectRows,
  buildIndicatorRows,
  buildWeakPointRows,
  buildWeakPointWeekRows,
} from './quality-datasets.core';
import type { PlacedDot } from './weak-points-page.core';
import type { EngagedWeakPoint } from './weak-points.core';

function indicator(overrides: Partial<Indicator>): Indicator {
  return {
    id: 'latency-p95',
    pillar: 'speed',
    label: 'p95',
    unit: 'ms',
    app: 'pragma',
    current: 2845,
    points: [
      { label: '2026-10-05', value: 1000 },
      { label: '2026-10-12', value: null },
    ],
    status: { kind: 'ok' },
    ...overrides,
  };
}

function weakPoint(overrides: Partial<EngagedWeakPoint>): EngagedWeakPoint {
  return {
    id: 'gate-measures-nothing',
    title: 'A gate reports green while measuring nothing',
    map: 'factory',
    engagedOn: '2026-10-10',
    countermeasure: 'Plant one defect per gate',
    isClosed: false,
    ...overrides,
  };
}

function placed(overrides: Partial<PlacedDot['dot']>, map: PlacedDot['map']): PlacedDot {
  return {
    dot: {
      slug: 'a-defect',
      title: 'A defect',
      date: '2026-10-12',
      zone: 'apps/pragma',
      weakPoint: null,
      recurs: [],
      stage: 'C',
      link: 'https://example.test/a',
      ...overrides,
    },
    map,
    row: 'apps/pragma',
    column: 'site',
  };
}

const TARGETS = [
  { indicatorId: 'latency-p95', app: 'pragma', ceiling: 2000 },
  { indicatorId: 'latency-p50', app: 'pragma', ceiling: 2000 },
];

describe('buildIndicatorRows', () => {
  it('stamps the range, the ceiling and the verdict on every indicator', () => {
    expect(buildIndicatorRows('week', [indicator({})], TARGETS)).toEqual([
      {
        range: 'week',
        pillar: 'speed',
        indicator: 'latency-p95',
        label: 'p95',
        app: 'pragma',
        unit: 'ms',
        value: 2845,
        ceiling: 2000,
        verdict: 'ko',
        note: 'pragma · p95 · over the ceiling of 2000',
      },
    ]);
  });

  it('reads the ceiling of this indicator and this application, not of a neighbour', () => {
    const rows = buildIndicatorRows(
      'week',
      [indicator({ current: 1000 })],
      [
        { indicatorId: 'latency-p50', app: 'pragma', ceiling: 1 },
        { indicatorId: 'latency-p95', app: 'talos', ceiling: 1 },
        { indicatorId: 'latency-p95', app: 'pragma', ceiling: 2000 },
      ],
    );
    expect(rows.at(0)).toMatchObject({ ceiling: 2000, verdict: 'ok' });
    expect(rows.at(0)?.note).toBe('pragma · p95 · at or under the ceiling of 2000');
  });

  it('says why an indicator holds no value, and judges it neither way', () => {
    const unavailable = buildIndicatorRows(
      'hour',
      [indicator({ current: null, status: { kind: 'unavailable', reason: 'token expired' } })],
      TARGETS,
    );
    expect(unavailable.at(0)).toMatchObject({
      value: null,
      verdict: 'unjudged',
      note: 'pragma · p95 · token expired',
    });
    const quiet = buildIndicatorRows('hour', [indicator({ current: null })], TARGETS);
    expect(quiet.at(0)?.note).toBe('pragma · p95 · no traffic in the rolling window');
    const uncapped = buildIndicatorRows('hour', [indicator({})], []);
    expect(uncapped.at(0)).toMatchObject({
      ceiling: null,
      verdict: 'unjudged',
      note: 'pragma · p95 · no ceiling in docs/quality/targets.md, so neither ok nor ko',
    });
  });
});

describe('buildBucketRows', () => {
  it('gives one row per bucket, keeping a bucket with no data', () => {
    expect(buildBucketRows('minute', [indicator({ app: 'talos' })])).toEqual([
      {
        range: 'minute',
        indicator: 'latency-p95',
        app: 'talos',
        bucket: '2026-10-05',
        value: 1000,
      },
      {
        range: 'minute',
        indicator: 'latency-p95',
        app: 'talos',
        bucket: '2026-10-12',
        value: null,
      },
    ]);
  });
});

describe('weak points', () => {
  const weeklyCounts = new Map([
    [
      'gate-measures-nothing',
      [
        { weekStart: '2026-10-05', count: 1 },
        { weekStart: '2026-10-12', count: 2 },
      ],
    ],
    ['quiet', [{ weekStart: '2026-10-12', count: 0 }]],
  ]);

  it('scores each open weak point on its current week', () => {
    const rows = buildWeakPointRows(
      [
        weakPoint({}),
        weakPoint({ id: 'quiet', title: 'A quiet one' }),
        weakPoint({ id: 'silent', title: 'No week at all' }),
        weakPoint({ id: 'closed', title: 'Closed', isClosed: true }),
      ],
      weeklyCounts,
    );
    expect(rows.map((row) => [row.id, row.occurrences, row.thisWeek, row.verdict])).toEqual([
      ['gate-measures-nothing', 3, 2, 'ko'],
      ['quiet', 0, 0, 'ok'],
      ['silent', 0, null, 'unjudged'],
    ]);
    expect(rows.at(0)).toMatchObject({ map: 'factory', engagedOn: '2026-10-10' });
    expect(rows.at(0)?.note).toBe(
      'factory map · engaged on 2026-10-10 · 3 occurrence(s) recorded · countermeasure: Plant one defect per gate · 2 in the week of 2026-10-12. Target: zero per week.',
    );
    expect(rows.at(2)?.note).toContain('no occurrence yet. Target: zero per week.');
  });

  it('gives one row per week of each open weak point', () => {
    expect(
      buildWeakPointWeekRows(
        [weakPoint({}), weakPoint({ id: 'silent' }), weakPoint({ id: 'closed', isClosed: true })],
        weeklyCounts,
      ),
    ).toEqual([
      { id: 'gate-measures-nothing', week: '2026-10-05', count: 1 },
      { id: 'gate-measures-nothing', week: '2026-10-12', count: 2 },
    ]);
  });
});

describe('buildDefectRows', () => {
  it('flattens each placed defect, naming its stage and its weak point', () => {
    expect(
      buildDefectRows([
        placed({}, 'product'),
        placed({ slug: 'b', stage: null, weakPoint: 'gate-measures-nothing' }, 'factory'),
      ]),
    ).toEqual([
      {
        slug: 'a-defect',
        title: 'A defect',
        date: '2026-10-12',
        stage: 'C',
        map: 'product',
        zone: 'apps/pragma',
        layer: 'site',
        link: 'https://example.test/a',
        engaged: '',
      },
      {
        slug: 'b',
        title: 'A defect',
        date: '2026-10-12',
        stage: 'none',
        map: 'factory',
        zone: 'apps/pragma',
        layer: 'site',
        link: 'https://example.test/a',
        engaged: 'gate-measures-nothing',
      },
    ]);
  });
});
