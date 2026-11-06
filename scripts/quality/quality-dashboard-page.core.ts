import {
  judgeAgainstTarget,
  type Indicator,
  type Pillar,
  type Target,
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

interface Score {
  readonly text: string;
  readonly verdict: Verdict;
}

interface Point {
  readonly label: string;
  readonly value: number | null;
}

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
const MONTH_DAY_START = 5;
const AXIS_INTERVALS = 4;
const ZOOM_GROUP = 'chart-zoom';
const UNSAFE_ID = /[^a-z0-9]+/gi;
const PAGE_NOTE =
  'Each indicator is the rolling seven days, and is ok or ko against its ceiling in docs/quality/targets.md. A closed row shows one pastille per application. Opening a row shows every value with its ceiling, then one eight-week graph per application, oldest week first. Clicking a graph opens it large, where hovering a week gives its value; clicking outside the graph closes it. Hover anything for its detail.';
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

function scoreOf(verdicts: readonly Verdict[]): Score {
  const okCount = verdicts.filter((verdict) => verdict === 'ok').length;
  const judgedCount = verdicts.filter((verdict) => verdict !== 'unjudged').length;
  if (judgedCount === 0) return { text: 'no ceiling', verdict: 'unjudged' };
  return {
    text: `${String(okCount)}/${String(judgedCount)} ok`,
    verdict: okCount === judgedCount ? 'ok' : 'ko',
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
  return `${name}${SEPARATOR}${String(indicator.current)}${UNIT_SUFFIX[indicator.unit]}${SEPARATOR}${comparison} the ceiling of ${String(ceiling)}${UNIT_SUFFIX[indicator.unit]}`;
}

function describeAmount(indicator: Indicator): string {
  if (indicator.current === null) return NO_VALUE;
  return `${String(indicator.current)}${UNIT_SUFFIX[indicator.unit]}`;
}

function describeGoal(ceiling: number | null, unit: Indicator['unit']): string {
  if (ceiling === null) return NO_GOAL;
  return `≤ ${String(ceiling)}${UNIT_SUFFIX[unit]}`;
}

function identifier(parts: readonly string[]): string {
  return parts.join('-').replaceAll(UNSAFE_ID, '-').toLowerCase();
}

function hasData(points: readonly Point[]): boolean {
  return points.some((point) => point.value !== null);
}

function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  const normalized = rough / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function buildAxis(points: readonly Point[]): {
  readonly maximum: number;
  readonly ticks: readonly number[];
} {
  const highest = Math.max(1, ...points.map((point) => point.value ?? 0));
  const step = niceStep(highest / AXIS_INTERVALS);
  const count = Math.ceil(highest / step);
  return {
    maximum: step * count,
    ticks: Array.from({ length: count + 1 }, (_, index) => index * step),
  };
}

function percentOf(value: number, maximum: number): string {
  return String(Math.round((value / maximum) * PERCENT));
}

function renderSparkline(points: readonly Point[], maximum: number, unit: string): string {
  const bars = points.map((point) => {
    if (point.value === null) {
      return `<span class="bar missing" title="week of ${point.label}: no data"></span>`;
    }
    const zero = point.value === 0 ? ' zero' : '';
    return `<span class="bar${zero}" style="height:${percentOf(point.value, maximum)}%" title="week of ${point.label}: ${String(point.value)}${unit}"></span>`;
  });
  return `<span class="bars">${bars.join('')}</span>`;
}

function renderColumn(point: Point, maximum: number, unit: string): string {
  const week = `week of ${point.label}`;
  if (point.value === null) {
    return `<span class="col"><span class="bar missing"><span class="bubble">${escapeHtml(`${week}: no data`)}</span></span></span>`;
  }
  const zero = point.value === 0 ? ' zero' : '';
  return `<span class="col"><span class="bar${zero}" style="height:${percentOf(point.value, maximum)}%"><span class="bubble">${escapeHtml(`${week}: ${String(point.value)}${unit}`)}</span></span></span>`;
}

function selectDrawnCeiling(maximum: number, ceiling: number | null): number | null {
  if (ceiling === null || ceiling > maximum) return null;
  return ceiling;
}

function renderCeilingLine(maximum: number, ceiling: number, unit: string): string {
  return `<span class="ceiling" style="bottom:${percentOf(ceiling, maximum)}%" title="${escapeHtml(`ceiling ${String(ceiling)}${unit}`)}"></span>`;
}

function renderLegend(ceiling: number | null, unit: string): string {
  const series = `<span><i class="swatch"></i>weekly value</span>`;
  if (ceiling === null) return `<span class="chart-legend">${series}</span>`;
  return `<span class="chart-legend">${series}<span><i class="swatch rule"></i>${escapeHtml(`ceiling ${String(ceiling)}${unit}`)}</span></span>`;
}

function renderPlot(
  points: readonly Point[],
  ceiling: number | null,
  unit: string,
  axis: { readonly maximum: number; readonly ticks: readonly number[] },
): string {
  const marks = axis.ticks.map(
    (tick) =>
      `<span class="tick" style="bottom:${percentOf(tick, axis.maximum)}%">${escapeHtml(`${String(tick)}${unit}`)}</span>`,
  );
  const lines = axis.ticks.map(
    (tick) => `<span class="gridline" style="bottom:${percentOf(tick, axis.maximum)}%"></span>`,
  );
  const drawn = selectDrawnCeiling(axis.maximum, ceiling);
  const line = drawn === null ? '' : renderCeilingLine(axis.maximum, drawn, unit);
  const columns = points.map((point) => renderColumn(point, axis.maximum, unit));
  const weeks = points.map(
    (point) => `<span>${escapeHtml(point.label.slice(MONTH_DAY_START))}</span>`,
  );
  return `<span class="plot"><span class="y-axis">${marks.join('')}</span><span class="panel">${lines.join('')}${line}<span class="series">${columns.join('')}</span></span></span><span class="x-axis"><span class="x-pad"></span><span class="x-weeks">${weeks.join('')}</span></span>${renderLegend(drawn, unit)}`;
}

function renderChart(
  key: string,
  name: string,
  detail: string,
  points: readonly Point[],
  ceiling: number | null,
  unit: string,
): string {
  if (!hasData(points)) return '';
  const axis = buildAxis(points);
  return `<details class="zoomable" name="${ZOOM_GROUP}" id="${key}"><summary class="chart" title="${escapeHtml(detail)}"><span class="chart-app">${escapeHtml(name)}</span>${renderSparkline(points, axis.maximum, unit)}</summary><span class="zoom"><span class="zoom-card"><span class="zoom-title">${escapeHtml(detail)}</span>${renderPlot(points, ceiling, unit, axis)}</span></span></details>`;
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

function renderPip(verdict: Verdict, detail: string): string {
  return `<span class="flag ${verdict}" title="${escapeHtml(detail)}"></span>`;
}

function renderRow(name: string, pips: string, score: Score, body: string): string {
  return `<details class="row"><summary><span class="row-name">${escapeHtml(name)}</span><span class="pips">${pips}</span><span class="score ${score.verdict}">${escapeHtml(score.text)}</span></summary>${body}</details>`;
}

function renderIndicatorRow(
  label: string,
  own: readonly Indicator[],
  targets: readonly Target[],
): string {
  const cells = own.map((indicator) => {
    const verdict = judge(indicator, targets);
    const ceiling = findCeiling(indicator, targets);
    const detail = describeIndicator(indicator, targets, verdict);
    return {
      verdict,
      detail,
      pip: renderPip(verdict, detail),
      tile: renderTile(
        indicator.app,
        verdict,
        describeAmount(indicator),
        describeGoal(ceiling, indicator.unit),
        detail,
      ),
      chart: renderChart(
        identifier([indicator.pillar, indicator.id, indicator.app]),
        indicator.app,
        detail,
        indicator.weeks.map((week) => ({ label: week.weekStart, value: week.value })),
        ceiling,
        UNIT_SUFFIX[indicator.unit],
      ),
    };
  });
  const charts = cells.map((cell) => cell.chart).join('');
  const body = `<div class="tiles">${cells.map((cell) => cell.tile).join('')}</div><div class="charts">${charts}</div>`;
  return renderRow(
    label,
    cells.map((cell) => cell.pip).join(''),
    scoreOf(cells.map((cell) => cell.verdict)),
    body,
  );
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
  score: Score,
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
  return renderSection(
    pillar.id,
    pillar.title,
    pillar.intent,
    scoreOf(own.map((indicator) => judge(indicator, targets))),
    renderWarning(own),
    rows.join(''),
  );
}

function renderWeakPointRow(weakPoint: EngagedWeakPoint, series: readonly WeeklyCount[]): string {
  const count = countCurrentWeek(series);
  const verdict = judgeCount(count, WEAK_POINT_CEILING);
  const detail = `${weakPoint.title}${SEPARATOR}${describeWeakPointMeta(weakPoint, series)}${SEPARATOR}${describeCurrentWeek(series)}`;
  const tile = renderTile(
    weakPoint.id,
    verdict,
    count === null ? NO_VALUE : String(count),
    describeGoal(WEAK_POINT_CEILING, 'count'),
    detail,
  );
  const chart = renderChart(
    identifier(['weak', weakPoint.id]),
    weakPoint.id,
    detail,
    series.map((week) => ({ label: week.weekStart, value: week.count })),
    WEAK_POINT_CEILING,
    UNIT_SUFFIX.count,
  );
  return renderRow(
    weakPoint.title,
    renderPip(verdict, detail),
    scoreOf([verdict]),
    `<div class="tiles">${tile}</div><div class="charts">${chart}</div>`,
  );
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
  return renderRow(
    title,
    '',
    { text: `${String(grid.placed.length)} dots`, verdict: 'unjudged' },
    `<div class="map" title="${escapeHtml(note)}">${renderGrid(grid.placed, grid.rows, grid.columns, now)}</div>`,
  );
}

function renderDefectMapSection(placed: readonly PlacedDot[], now: string): string {
  const { product, factory } = splitDefectMaps(placed);
  const score: Score = { text: `${String(placed.length)} defects`, verdict: 'unjudged' };
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
