import {
  judgeAgainstTarget,
  type Indicator,
  type Pillar,
  type Target,
  type WeeklyValue,
} from './quality-dashboard.core';
import { escapeHtml, renderQualityFragment } from './quality-page.core';
import {
  FACTORY_MAP_NOTE,
  FACTORY_MAP_TITLE,
  PRODUCT_MAP_NOTE,
  PRODUCT_MAP_TITLE,
  countCurrentWeek,
  describeCurrentWeek,
  describeWeakPointMeta,
  listOpenWeakPoints,
  renderGrid,
  renderStageLegend,
  renderWeeklyBars,
  splitDefectMaps,
  type MapGrid,
  type PlacedDot,
} from './weak-points-page.core';
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
const PERCENT = 100;
const NO_VALUE = '—';
const NO_GOAL = 'no ceiling';
const NO_TRAFFIC = 'no traffic in the rolling seven days';
const NO_CEILING = 'no ceiling in docs/quality/targets.md, so neither ok nor ko';
const WARNING_GLYPH = '⚠';
const SEPARATOR = ' · ';
const WEAK_POINT_CEILING = 0;
const PAGE_NOTE =
  'Each indicator is the rolling seven days, and is ok or ko against its ceiling in docs/quality/targets.md. A closed section shows how many of its indicators are ok. Opening a row shows one eight-week graph per application, oldest week first; clicking a graph opens it large. Hover anything for its detail.';
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

function judgeCount(count: number | null, ceiling: number): Verdict {
  if (count === null) return 'unjudged';
  return count <= ceiling ? 'ok' : 'ko';
}

function scoreVerdict(okCount: number, judgedCount: number): Verdict {
  if (judgedCount === 0) return 'unjudged';
  return okCount === judgedCount ? 'ok' : 'ko';
}

function scoreOf(verdicts: readonly Verdict[]): {
  readonly text: string;
  readonly verdict: Verdict;
} {
  const okCount = verdicts.filter((verdict) => verdict === 'ok').length;
  const judgedCount = verdicts.filter((verdict) => verdict !== 'unjudged').length;
  return {
    text: `${String(okCount)}/${String(judgedCount)} ok`,
    verdict: scoreVerdict(okCount, judgedCount),
  };
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
  const name = `${indicator.app}${SEPARATOR}${indicator.label}`;
  const missing = describeMissingValue(indicator);
  if (missing !== null) return `${name}${SEPARATOR}${missing}`;
  const ceiling = findCeiling(indicator, targets);
  if (ceiling === null) return `${name}${SEPARATOR}${NO_CEILING}`;
  const comparison = verdict === 'ok' ? 'at or under' : 'over';
  return `${name}${SEPARATOR}${comparison} the ceiling of ${String(ceiling)}${UNIT_SUFFIX[indicator.unit]}`;
}

function describeAmount(indicator: Indicator): string {
  if (indicator.current === null) return NO_VALUE;
  return `${String(indicator.current)}${UNIT_SUFFIX[indicator.unit]}`;
}

function describeGoal(indicator: Indicator, targets: readonly Target[]): string {
  const ceiling = findCeiling(indicator, targets);
  if (ceiling === null) return NO_GOAL;
  return `≤ ${String(ceiling)}${UNIT_SUFFIX[indicator.unit]}`;
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
  return `<div class="bars">${bars.join('')}</div>`;
}

function renderTile(
  name: string,
  verdict: Verdict,
  amount: string,
  goal: string,
  detail: string,
): string {
  return `<span class="tile" title="${escapeHtml(detail)}"><span class="tile-head"><span class="flag ${verdict}"></span><span class="tile-app">${escapeHtml(name)}</span></span><span class="tile-value">${escapeHtml(amount)}</span><span class="tile-goal">${escapeHtml(goal)}</span></span>`;
}

function renderChart(name: string, detail: string, bars: string): string {
  return `<button type="button" class="chart" title="${escapeHtml(detail)}"><span class="chart-app">${escapeHtml(name)}</span>${bars}</button>`;
}

function renderRow(title: string, tiles: string, charts: string): string {
  const head = `<span class="row-name">${escapeHtml(title)}</span><div class="tiles">${tiles}</div>`;
  if (charts === '') return `<div class="row flat">${head}</div>`;
  return `<details class="row"><summary>${head}</summary><div class="charts">${charts}</div></details>`;
}

function renderIndicatorRow(
  label: string,
  own: readonly Indicator[],
  targets: readonly Target[],
): string {
  const tiles = own
    .map((indicator) => {
      const verdict = judge(indicator, targets);
      return renderTile(
        indicator.app,
        verdict,
        describeAmount(indicator),
        describeGoal(indicator, targets),
        describeIndicator(indicator, targets, verdict),
      );
    })
    .join('');
  const charts = own
    .flatMap((indicator) => {
      const bars = renderTrend(indicator.weeks);
      if (bars === '') return [];
      const verdict = judge(indicator, targets);
      return [renderChart(indicator.app, describeIndicator(indicator, targets, verdict), bars)];
    })
    .join('');
  return renderRow(label, tiles, charts);
}

function orderedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function renderWarning(indicators: readonly Indicator[]): string {
  const reasons = orderedUnique(
    indicators.flatMap((indicator) =>
      indicator.status.kind === 'unavailable' ? [indicator.status.reason] : [],
    ),
  );
  if (reasons.length === 0) return '';
  return `<span class="warn" role="img" aria-label="a source could not be read" title="${escapeHtml(reasons.join(SEPARATOR))}">${WARNING_GLYPH}</span>`;
}

function renderSection(
  id: string,
  title: string,
  note: string,
  score: { readonly text: string; readonly verdict: Verdict },
  warning: string,
  body: string,
): string {
  return `<details class="section section-${id}"><summary title="${escapeHtml(note)}"><h2>${escapeHtml(title)}</h2><span class="score ${score.verdict}">${escapeHtml(score.text)}</span>${warning}</summary><div class="rows">${body}</div></details>`;
}

function renderPillar(
  pillar: (typeof PILLARS)[number],
  indicators: readonly Indicator[],
  targets: readonly Target[],
): string {
  const own = indicators.filter((indicator) => indicator.pillar === pillar.id);
  const rows = orderedUnique(own.map((indicator) => indicator.label)).map((label) =>
    renderIndicatorRow(
      label,
      own.filter((indicator) => indicator.label === label),
      targets,
    ),
  );
  const score = scoreOf(own.map((indicator) => judge(indicator, targets)));
  return renderSection(
    pillar.id,
    pillar.title,
    pillar.intent,
    score,
    renderWarning(own),
    rows.join(''),
  );
}

function renderWeakPointRow(weakPoint: EngagedWeakPoint, series: readonly WeeklyCount[]): string {
  const count = countCurrentWeek(series);
  const verdict = judgeCount(count, WEAK_POINT_CEILING);
  const amount = count === null ? NO_VALUE : String(count);
  const detail = `${describeWeakPointMeta(weakPoint, series)}${SEPARATOR}${describeCurrentWeek(series)}`;
  const tiles = renderTile(
    weakPoint.id,
    verdict,
    amount,
    `≤ ${String(WEAK_POINT_CEILING)}`,
    detail,
  );
  const charts =
    series.length === 0 ? '' : renderChart(weakPoint.id, detail, renderWeeklyBars(series));
  return renderRow(weakPoint.title, tiles, charts);
}

function renderWeakPointSection(
  allEngaged: readonly EngagedWeakPoint[],
  weeklyCounts: ReadonlyMap<string, readonly WeeklyCount[]>,
): string {
  const engaged = listOpenWeakPoints(allEngaged).map((weakPoint) => ({
    weakPoint,
    series: weeklyCounts.get(weakPoint.id) ?? [],
  }));
  const score = scoreOf(
    engaged.map((entry) => judgeCount(countCurrentWeek(entry.series), WEAK_POINT_CEILING)),
  );
  const rows = engaged.map((entry) => renderWeakPointRow(entry.weakPoint, entry.series));
  return renderSection(
    'weak-points',
    'Engaged weak points',
    WEAK_POINTS_NOTE,
    score,
    '',
    rows.join(''),
  );
}

function renderMapRow(title: string, note: string, grid: MapGrid, now: string): string {
  const tiles = renderTile(
    'dots',
    'unjudged',
    String(grid.placed.length),
    NO_GOAL,
    `${title}${SEPARATOR}${note}`,
  );
  const head = `<span class="row-name">${escapeHtml(title)}</span><div class="tiles">${tiles}</div>`;
  return `<details class="row"><summary>${head}</summary>${renderGrid(grid.placed, grid.rows, grid.columns, now)}</details>`;
}

function renderDefectMapSection(placed: readonly PlacedDot[], now: string): string {
  const { product, factory } = splitDefectMaps(placed);
  const score = { text: `${String(placed.length)} defects`, verdict: 'unjudged' as const };
  const body = `${renderStageLegend('board')}${renderMapRow(PRODUCT_MAP_TITLE, PRODUCT_MAP_NOTE, product, now)}${renderMapRow(FACTORY_MAP_TITLE, FACTORY_MAP_NOTE, factory, now)}`;
  return renderSection('defect-map', 'Defect map', DEFECT_MAP_NOTE, score, '', body);
}

export function renderDashboardPage(input: DashboardPageInput): string {
  const sections = [
    ...PILLARS.map((pillar) => renderPillar(pillar, input.indicators, input.targets)),
    renderWeakPointSection(input.engaged, input.weeklyCounts),
    renderDefectMapSection(input.placed, input.now),
  ];
  return renderQualityFragment(
    'borso.fr 3S board',
    `Generated by scripts/quality/quality-dashboard.ts on ${input.now}. ${PAGE_NOTE}`,
    `<div class="sections">${sections.join('')}</div>`,
  );
}
