import { judgeAgainstTarget, type Indicator, type Target } from './quality-dashboard.core';
import type { PlacedDot } from './weak-points-page.core';
import {
  countCurrentWeek,
  describeCurrentWeek,
  describeWeakPointMeta,
  listOpenWeakPoints,
} from './weak-points-page.core';
import type { EngagedWeakPoint, WeeklyCount } from './weak-points.core';

export type Verdict = 'ok' | 'ko' | 'unjudged';

export interface IndicatorRow {
  readonly range: string;
  readonly pillar: string;
  readonly indicator: string;
  readonly label: string;
  readonly app: string;
  readonly unit: string;
  readonly value: number | null;
  readonly ceiling: number | null;
  readonly verdict: Verdict;
  readonly note: string;
}

export interface BucketRow {
  readonly range: string;
  readonly indicator: string;
  readonly app: string;
  readonly bucket: string;
  readonly value: number | null;
}

export interface WeakPointRow {
  readonly id: string;
  readonly title: string;
  readonly map: string;
  readonly engagedOn: string;
  readonly occurrences: number;
  readonly thisWeek: number | null;
  readonly verdict: Verdict;
  readonly note: string;
}

export interface WeakPointWeekRow {
  readonly id: string;
  readonly week: string;
  readonly count: number;
}

export interface DefectRow {
  readonly slug: string;
  readonly title: string;
  readonly date: string;
  readonly stage: string;
  readonly map: string;
  readonly zone: string;
  readonly layer: string;
  readonly link: string;
  readonly engaged: string;
}

const NO_TRAFFIC = 'no traffic in the rolling window';
const NO_CEILING = 'no ceiling in docs/quality/targets.md, so neither ok nor ko';
const SEPARATOR = ' · ';
const WEAK_POINT_CEILING = 0;
const NO_STAGE = 'none';

export function judge(indicator: Indicator, targets: readonly Target[]): Verdict {
  const verdict = judgeAgainstTarget(indicator, targets);
  if (verdict === 'within') return 'ok';
  if (verdict === 'over') return 'ko';
  return 'unjudged';
}

export function judgeCount(count: number | null, ceiling: number): Verdict {
  if (count === null) return 'unjudged';
  return count <= ceiling ? 'ok' : 'ko';
}

export function findCeiling(indicator: Indicator, targets: readonly Target[]): number | null {
  const target = targets.find(
    (candidate) => candidate.indicatorId === indicator.id && candidate.app === indicator.app,
  );
  return target === undefined ? null : target.ceiling;
}

function describeMissingValue(indicator: Indicator): string | null {
  if (indicator.status.kind !== 'ok') return indicator.status.reason;
  if (indicator.current === null) return NO_TRAFFIC;
  return null;
}

export function describeIndicator(
  indicator: Indicator,
  targets: readonly Target[],
  verdict: Verdict,
): string {
  const name = `${indicator.app}${SEPARATOR}${indicator.label}`;
  const missing = describeMissingValue(indicator);
  if (missing !== null) return `${name}${SEPARATOR}${missing}`;
  const ceiling = findCeiling(indicator, targets);
  if (ceiling === null) return `${name}${SEPARATOR}${NO_CEILING}`;
  const comparison = verdict === 'ok' ? 'at or under' : 'over';
  return `${name}${SEPARATOR}${comparison} the ceiling of ${String(ceiling)}`;
}

export function buildIndicatorRows(
  rangeId: string,
  indicators: readonly Indicator[],
  targets: readonly Target[],
): readonly IndicatorRow[] {
  return indicators.map((indicator) => {
    const verdict = judge(indicator, targets);
    return {
      range: rangeId,
      pillar: indicator.pillar,
      indicator: indicator.id,
      label: indicator.label,
      app: indicator.app,
      unit: indicator.unit,
      value: indicator.current,
      ceiling: findCeiling(indicator, targets),
      verdict,
      note: describeIndicator(indicator, targets, verdict),
    };
  });
}

export function buildBucketRows(
  rangeId: string,
  indicators: readonly Indicator[],
): readonly BucketRow[] {
  return indicators.flatMap((indicator) =>
    indicator.points.map((point) => ({
      range: rangeId,
      indicator: indicator.id,
      app: indicator.app,
      bucket: point.label,
      value: point.value,
    })),
  );
}

export function buildWeakPointRows(
  allEngaged: readonly EngagedWeakPoint[],
  weeklyCounts: ReadonlyMap<string, readonly WeeklyCount[]>,
): readonly WeakPointRow[] {
  return listOpenWeakPoints(allEngaged).map((weakPoint) => {
    const series = weeklyCounts.get(weakPoint.id) ?? [];
    const thisWeek = countCurrentWeek(series);
    return {
      id: weakPoint.id,
      title: weakPoint.title,
      map: weakPoint.map,
      engagedOn: weakPoint.engagedOn,
      occurrences: series.reduce((sum, week) => sum + week.count, 0),
      thisWeek,
      verdict: judgeCount(thisWeek, WEAK_POINT_CEILING),
      note: `${describeWeakPointMeta(weakPoint, series)}${SEPARATOR}${describeCurrentWeek(series)}`,
    };
  });
}

export function buildWeakPointWeekRows(
  allEngaged: readonly EngagedWeakPoint[],
  weeklyCounts: ReadonlyMap<string, readonly WeeklyCount[]>,
): readonly WeakPointWeekRow[] {
  return listOpenWeakPoints(allEngaged).flatMap((weakPoint) =>
    (weeklyCounts.get(weakPoint.id) ?? []).map((week) => ({
      id: weakPoint.id,
      week: week.weekStart,
      count: week.count,
    })),
  );
}

export function buildDefectRows(placed: readonly PlacedDot[]): readonly DefectRow[] {
  return placed.map((entry) => ({
    slug: entry.dot.slug,
    title: entry.dot.title,
    date: entry.dot.date,
    stage: entry.dot.stage ?? NO_STAGE,
    map: entry.map,
    zone: entry.row,
    layer: entry.column,
    link: entry.dot.link,
    engaged: entry.dot.weakPoint ?? '',
  }));
}
