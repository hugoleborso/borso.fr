import {
  REPOSITORY_ROW,
  judgeAgainstTarget,
  type Indicator,
  type Pillar,
  type Target,
  type WeeklyValue,
} from './quality-dashboard.core';
import { escapeHtml, renderQualityFragment } from './quality-page.core';
import { renderEngagedWeakPoints, renderVaricelle, type PlacedDot } from './weak-points-page.core';
import type { EngagedWeakPoint, WeeklyCount } from './weak-points.core';

export interface DashboardPageInput {
  readonly now: string;
  readonly indicators: readonly Indicator[];
  readonly targets: readonly Target[];
  readonly placed: readonly PlacedDot[];
  readonly engaged: readonly EngagedWeakPoint[];
  readonly weeklyCounts: ReadonlyMap<string, readonly WeeklyCount[]>;
}

type Verdict = 'ok' | 'ko' | 'unjudged';

const PILLARS: readonly { readonly id: Pillar; readonly title: string; readonly intent: string }[] =
  [
    {
      id: 'speed',
      title: 'Speed',
      intent: 'Latency of each production API, in milliseconds.',
    },
    {
      id: 'stability',
      title: 'Stability',
      intent:
        'API 5xx and Lambda throttling on previews and in production, Sentry errors, and bugs users reported.',
    },
    {
      id: 'security',
      title: 'Security',
      intent: 'Known vulnerable dependencies and exposed secrets, counted, never named.',
    },
  ];

const UNIT_SUFFIX: Readonly<Record<Indicator['unit'], string>> = { count: '', ms: ' ms' };
const VERDICT_RANK: Readonly<Record<Verdict, number>> = { ko: 0, ok: 1, unjudged: 2 };
const PERCENT = 100;
const NO_VALUE = '—';
const NO_TRAFFIC = 'no traffic in the rolling seven days';
const NO_CEILING = 'no ceiling in docs/quality/targets.md, so neither ok nor ko';
const WARNING_GLYPH = '⚠';
const NAME_SEPARATOR = ' · ';
const REASON_SEPARATOR = ' · ';
const PAGE_NOTE =
  'Each indicator is the rolling seven days, and is ok or ko against its ceiling in docs/quality/targets.md. A closed section shows how many of its indicators are ok. Opening an indicator shows its last eight weeks, oldest first. Hover anything for its detail.';
const WEAK_POINTS_NOTE =
  'Each weak point engaged in docs/quality/weak-points.md, with the dantotsus that recorded it, week by week. Target: zero per week.';
const DEFECT_MAP_NOTE =
  'One dot per defect, placed where it lived and coloured by the stage that caught it. A dantotsu gives its stage through detected-at; a bug report filed in pragma is stage E and sits on pragma row. A full dot is recent, a ringed dot belongs to an engaged weak point.';

function judge(indicator: Indicator, targets: readonly Target[]): Verdict {
  const verdict = judgeAgainstTarget(indicator, targets);
  if (verdict === 'within') return 'ok';
  if (verdict === 'over') return 'ko';
  return 'unjudged';
}

function findCeiling(indicator: Indicator, targets: readonly Target[]): number | null {
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

function describeIndicator(
  indicator: Indicator,
  targets: readonly Target[],
  verdict: Verdict,
): string {
  const missing = describeMissingValue(indicator);
  if (missing !== null) return `${indicator.id}${REASON_SEPARATOR}${missing}`;
  const ceiling = findCeiling(indicator, targets);
  if (ceiling === null) return `${indicator.id}${REASON_SEPARATOR}${NO_CEILING}`;
  const comparison = verdict === 'ok' ? 'at or under' : 'over';
  const unit = UNIT_SUFFIX[indicator.unit];
  return `${indicator.id}${REASON_SEPARATOR}${comparison} the ceiling of ${String(ceiling)}${unit}`;
}

function nameIndicator(indicator: Indicator): string {
  if (indicator.app === REPOSITORY_ROW) return indicator.label;
  return `${indicator.app}${NAME_SEPARATOR}${indicator.label}`;
}

function describeAmount(indicator: Indicator): string {
  if (indicator.current === null) return NO_VALUE;
  return `${String(indicator.current)}${UNIT_SUFFIX[indicator.unit]}`;
}

function renderTrend(weeks: readonly WeeklyValue[]): string {
  if (weeks.every((week) => week.value === null)) return '';
  const highest = Math.max(1, ...weeks.map((week) => week.value ?? 0));
  const bars = weeks.map((week) => {
    if (week.value === null) {
      return `<span class="bar missing" title="week of ${week.weekStart}: no data"></span>`;
    }
    const height = Math.round((week.value / highest) * PERCENT);
    const zero = week.value === 0 ? ' zero' : '';
    return `<span class="bar${zero}" style="height:${String(height)}%" title="week of ${week.weekStart}: ${String(week.value)}"></span>`;
  });
  return `<div class="bars small" aria-label="eight-week trend">${bars.join('')}</div>`;
}

function renderIndicator(indicator: Indicator, targets: readonly Target[]): string {
  const verdict = judge(indicator, targets);
  const detail = escapeHtml(describeIndicator(indicator, targets, verdict));
  const row = `<span class="flag ${verdict}"></span><span class="who">${escapeHtml(nameIndicator(indicator))}</span><span class="amount">${escapeHtml(describeAmount(indicator))}</span>`;
  const trend = renderTrend(indicator.weeks);
  if (trend === '') return `<div class="indicator flat" title="${detail}">${row}</div>`;
  return `<details class="indicator"><summary title="${detail}">${row}</summary>${trend}</details>`;
}

function renderWarning(indicators: readonly Indicator[]): string {
  const reasons = [
    ...new Set(
      indicators.flatMap((indicator) =>
        indicator.status.kind === 'unavailable' ? [indicator.status.reason] : [],
      ),
    ),
  ];
  if (reasons.length === 0) return '';
  return `<span class="warn" role="img" aria-label="a source could not be read" title="${escapeHtml(reasons.join(REASON_SEPARATOR))}">${WARNING_GLYPH}</span>`;
}

function scoreVerdict(okCount: number, judgedCount: number): Verdict {
  if (judgedCount === 0) return 'unjudged';
  return okCount === judgedCount ? 'ok' : 'ko';
}

function renderPillar(
  pillar: (typeof PILLARS)[number],
  indicators: readonly Indicator[],
  targets: readonly Target[],
): string {
  const own = indicators.filter((indicator) => indicator.pillar === pillar.id);
  const verdicts = own.map((indicator) => judge(indicator, targets));
  const okCount = verdicts.filter((verdict) => verdict === 'ok').length;
  const judgedCount = verdicts.filter((verdict) => verdict !== 'unjudged').length;
  const scoreClass = scoreVerdict(okCount, judgedCount);
  const score = `${String(okCount)}/${String(judgedCount)} ok`;
  const rows = [...own]
    .sort(
      (first, second) => VERDICT_RANK[judge(first, targets)] - VERDICT_RANK[judge(second, targets)],
    )
    .map((indicator) => renderIndicator(indicator, targets));
  return `<details class="pillar pillar-${pillar.id}"><summary title="${escapeHtml(pillar.intent)}"><h2>${pillar.title}</h2><span class="score ${scoreClass}">${score}</span>${renderWarning(own)}</summary><div class="rows">${rows.join('')}</div></details>`;
}

export function renderDashboardPage(input: DashboardPageInput): string {
  const pillars = PILLARS.map((pillar) => renderPillar(pillar, input.indicators, input.targets));
  return renderQualityFragment(
    'borso.fr 3S board',
    `Generated by scripts/quality/quality-dashboard.ts on ${input.now}. ${PAGE_NOTE}`,
    `<div class="pillars">${pillars.join('')}</div>
<h2 title="${escapeHtml(WEAK_POINTS_NOTE)}">Engaged weak points</h2>
${renderEngagedWeakPoints(input.engaged, input.weeklyCounts, 'tooltip')}
<h2 title="${escapeHtml(DEFECT_MAP_NOTE)}">Defect map</h2>
${renderVaricelle(input.placed, input.now, 'tooltip')}`,
  );
}
