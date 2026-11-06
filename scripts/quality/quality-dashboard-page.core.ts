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

export interface RangeView {
  readonly id: string;
  readonly title: string;
  readonly indicators: readonly Indicator[];
}

export interface DashboardPageInput {
  readonly now: string;
  readonly ranges: readonly RangeView[];
  readonly security: readonly Indicator[];
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

interface PillarView {
  readonly id: Pillar;
  readonly title: string;
  readonly intent: string;
}

const RATE_PILLARS: readonly PillarView[] = [
  {
    id: 'speed',
    title: 'Speed',
    intent: 'Latency of each production API, in milliseconds, over the selected range.',
  },
  {
    id: 'stability',
    title: 'Stability',
    intent:
      'API 5xx and Lambda throttling on previews and in production, Sentry errors, and bugs users reported, over the selected range.',
  },
];

const SECURITY_PILLAR: PillarView = {
  id: 'security',
  title: 'Security',
  intent:
    'Known vulnerable dependencies and exposed secrets, counted, never named. This is the state of the repository now, so the range above does not change it.',
};

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
const RANGE_GROUP = 'range';
const RANGE_NOTE =
  'The range the Speed and Stability values are measured over. Week by week is the rolling seven days with eight weekly buckets, the others are the rolling window with hourly or minute buckets. Sentry has no bucket under a week, so its graph is empty there.';
const UNSAFE_ID = /[^a-z0-9]+/gi;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
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
      return `<span class="bar missing" title="${point.label}: no data"></span>`;
    }
    const zero = point.value === 0 ? ' zero' : '';
    return `<span class="bar${zero}" style="height:${percentOf(point.value, maximum)}%" title="${point.label}: ${String(point.value)}${unit}"></span>`;
  });
  return `<span class="bars">${bars.join('')}</span>`;
}

function selectLabelledWeeks(points: readonly Point[]): ReadonlySet<number> {
  const peak = Math.max(...points.map((point) => point.value ?? 0));
  return new Set([
    points.findIndex((point) => point.value === peak),
    points.map((point) => point.value).lastIndexOf(peak),
    points.length - 1,
  ]);
}

function tickOf(label: string): string {
  return ISO_DATE.test(label) ? label.slice(MONTH_DAY_START) : label;
}

function renderColumn(point: Point, maximum: number, unit: string, isLabelled: boolean): string {
  if (point.value === null) return `<span class="col"><span class="bar missing"></span></span>`;
  const zero = point.value === 0 ? ' zero' : '';
  const label = isLabelled
    ? `<span class="week-value">${escapeHtml(`${String(point.value)}${unit}`)}</span>`
    : '';
  return `<span class="col" title="${escapeHtml(`${point.label}: ${String(point.value)}${unit}`)}"><span class="bar${zero}" style="height:${percentOf(point.value, maximum)}%">${label}</span></span>`;
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
  const labelled = selectLabelledWeeks(points);
  const columns = points.map((point, index) =>
    renderColumn(point, axis.maximum, unit, labelled.has(index)),
  );
  const weeks = points.map((point) => `<span>${escapeHtml(tickOf(point.label))}</span>`);
  return `<span class="plot"><span class="y-axis">${marks.join('')}</span><span class="panel">${lines.join('')}${line}<span class="series">${columns.join('')}</span></span></span><span class="x-axis"><span class="x-pad"></span><span class="x-weeks">${weeks.join('')}</span></span>${renderLegend(drawn, unit)}`;
}

interface Cell {
  readonly key: string;
  readonly name: string;
  readonly verdict: Verdict;
  readonly amount: string;
  readonly goal: string;
  readonly detail: string;
  readonly points: readonly Point[];
  readonly ceiling: number | null;
  readonly unit: string;
}

function renderChipFace(cell: Cell, sparkline: string): string {
  return `<span class="chip-head"><span class="flag ${cell.verdict}"></span><span class="chip-app">${escapeHtml(cell.name)}</span></span><span class="chip-value">${escapeHtml(cell.amount)}</span><span class="chip-goal">${escapeHtml(cell.goal)}</span>${sparkline}`;
}

function renderChip(cell: Cell): string {
  if (!hasData(cell.points)) {
    return `<span class="chip flat" title="${escapeHtml(cell.detail)}">${renderChipFace(cell, '')}</span>`;
  }
  const axis = buildAxis(cell.points);
  const face = renderChipFace(cell, renderSparkline(cell.points, axis.maximum, cell.unit));
  return `<details class="zoomable" name="${ZOOM_GROUP}" id="${cell.key}"><summary class="chip" title="${escapeHtml(cell.detail)}">${face}</summary><span class="zoom"><span class="zoom-card"><span class="zoom-title">${escapeHtml(cell.detail)}</span>${renderPlot(cell.points, cell.ceiling, cell.unit, axis)}</span></span></details>`;
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
  const cells = own.map((indicator): Cell => {
    const verdict = judge(indicator, targets);
    const ceiling = findCeiling(indicator, targets);
    return {
      key: identifier([indicator.pillar, indicator.id, indicator.app]),
      name: indicator.app,
      verdict,
      amount: describeAmount(indicator),
      goal: describeGoal(ceiling, indicator.unit),
      detail: describeIndicator(indicator, targets, verdict),
      points: indicator.points,
      ceiling,
      unit: UNIT_SUFFIX[indicator.unit],
    };
  });
  return renderRow(
    label,
    cells.map((cell) => renderPip(cell.verdict, cell.detail)).join(''),
    scoreOf(cells.map((cell) => cell.verdict)),
    `<div class="chips">${cells.map(renderChip).join('')}</div>`,
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
  pillar: PillarView,
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
  const chip = renderChip({
    key: identifier(['weak', weakPoint.id]),
    name: weakPoint.id,
    verdict,
    amount: count === null ? NO_VALUE : String(count),
    goal: describeGoal(WEAK_POINT_CEILING, 'count'),
    detail,
    points: series.map((week) => ({ label: week.weekStart, value: week.count })),
    ceiling: WEAK_POINT_CEILING,
    unit: UNIT_SUFFIX.count,
  });
  return renderRow(
    weakPoint.title,
    renderPip(verdict, detail),
    scoreOf([verdict]),
    `<div class="chips">${chip}</div>`,
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

function renderStageRow(): string {
  return `<div class="row flat"><span class="row-name">Stages</span><span class="pips">${renderStageLegend('board')}</span></div>`;
}

function renderDefectMapSection(placed: readonly PlacedDot[], now: string): string {
  const { product, factory } = splitDefectMaps(placed);
  const score: Score = { text: `${String(placed.length)} defects`, verdict: 'unjudged' };
  const body = `${renderStageRow()}${renderMapRow(PRODUCT_MAP_TITLE, PRODUCT_MAP_NOTE, product, now)}${renderMapRow(FACTORY_MAP_TITLE, FACTORY_MAP_NOTE, factory, now)}`;
  return renderSection('defect-map', 'Defect map', DEFECT_MAP_NOTE, score, '', body);
}

function renderRangeSwitch(ranges: readonly RangeView[], targets: readonly Target[]): string {
  const radios = ranges.map(
    (range, index) =>
      `<input type="radio" class="range-pick" name="${RANGE_GROUP}" id="range-${range.id}"${index === 0 ? ' checked' : ''}>`,
  );
  const tabs = ranges.map(
    (range) =>
      `<label class="range-tab" for="range-${range.id}">${escapeHtml(range.title)}</label>`,
  );
  const panels = ranges.map((range) => {
    const sections = RATE_PILLARS.map((pillar) => renderPillar(pillar, range.indicators, targets));
    return `<div class="range-panel" data-range="${range.id}">${sections.join('')}</div>`;
  });
  return `<div class="range-switch">${radios.join('')}<div class="range-tabs" role="tablist" title="${escapeHtml(RANGE_NOTE)}">${tabs.join('')}</div>${panels.join('')}</div>`;
}

export function renderDashboardPage(input: DashboardPageInput): string {
  const standing = [
    renderPillar(SECURITY_PILLAR, input.security, input.targets),
    renderWeakPointSection(input.engaged, input.weeklyCounts),
    renderDefectMapSection(input.placed, input.now),
  ];
  return renderQualityFragment(
    'borso.fr 3S board',
    `Generated by scripts/quality/quality-dashboard.ts on ${input.now}. ${PAGE_NOTE}`,
    `${renderRangeSwitch(input.ranges, input.targets)}<div class="sections">${standing.join('')}</div>`,
  );
}
