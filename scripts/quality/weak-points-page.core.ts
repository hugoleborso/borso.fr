import {
  FACTORY_STATIONS,
  STAGE_MEANINGS,
  STAGES,
  type DefectDot,
  type EngagedWeakPoint,
  type Recurrence,
  type WeeklyCount,
} from './weak-points.core';
import { escapeHtml, renderQualityPage } from './quality-page.core';

export interface PlacedDot {
  readonly dot: DefectDot;
  readonly map: 'product' | 'factory';
  readonly row: string;
  readonly column: string;
}

export interface MapGrid {
  readonly placed: readonly PlacedDot[];
  readonly rows: readonly string[];
  readonly columns: readonly string[];
}

export interface WeakPointPageInput {
  readonly now: string;
  readonly placed: readonly PlacedDot[];
  readonly engaged: readonly EngagedWeakPoint[];
  readonly weeklyCounts: ReadonlyMap<string, readonly WeeklyCount[]>;
  readonly recurrences: readonly Recurrence[];
}

const DANTOTSU_ADDRESS = 'https://github.com/hugoleborso/borso.fr/blob/main/docs/dantotsus/';
const RECENT_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;
const FACTORY_COLUMN = 'defects';
const PERCENT = 100;
const NO_OCCURRENCE = 'no occurrence yet';

export const PRODUCT_MAP_TITLE = 'Product map';
export const FACTORY_MAP_TITLE = 'Factory map';
export const PRODUCT_MAP_NOTE =
  'Applications and infrastructure packages by layer, the layer read from the path the way the blueprint scripts read it.';
export const FACTORY_MAP_NOTE =
  'The stations of the line that builds the product: the skills, the gates, the hooks, CI and the deploy.';

function daysBetween(earlier: string, later: string): number {
  return (Date.parse(later) - Date.parse(earlier)) / MILLISECONDS_PER_DAY;
}

function renderDot(dot: DefectDot, now: string): string {
  const classes = ['dot'];
  if (daysBetween(dot.date, now) <= RECENT_DAYS) classes.push('recent');
  if (dot.stage !== null) classes.push(`stage-${dot.stage.toLowerCase()}`);
  if (dot.weakPoint !== null) classes.push('engaged');
  const stageText = dot.stage === null ? '' : ` · stage ${dot.stage}`;
  const label = `${dot.date}${stageText} · ${dot.title}`;
  return `<a class="${classes.join(' ')}" href="${escapeHtml(dot.link)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></a>`;
}

function countByKey(values: readonly string[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function orderByCount(values: readonly string[]): readonly string[] {
  return [...countByKey(values)]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([value]) => value);
}

export function renderGrid(
  placed: readonly PlacedDot[],
  rows: readonly string[],
  columns: readonly string[],
  now: string,
): string {
  const header = `<tr><th></th>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => {
      const dots = placed
        .filter((entry) => entry.row === row && entry.column === column)
        .map((entry) => renderDot(entry.dot, now));
      return `<td class="cell">${dots.join('')}</td>`;
    });
    const total = placed.filter((entry) => entry.row === row).length;
    return `<tr><th>${escapeHtml(row)} (${String(total)})</th>${cells.join('')}</tr>`;
  });
  return `<div class="scroll"><table>${header}${body.join('')}</table></div>`;
}

export function splitDefectMaps(placed: readonly PlacedDot[]): {
  readonly product: MapGrid;
  readonly factory: MapGrid;
} {
  const product = placed.filter((entry) => entry.map === 'product');
  const factory = placed.filter((entry) => entry.map === 'factory');
  return {
    product: {
      placed: product,
      rows: orderByCount(product.map((entry) => entry.row)),
      columns: orderByCount(product.map((entry) => entry.column)),
    },
    factory: {
      placed: factory,
      rows: FACTORY_STATIONS.filter((station) => factory.some((entry) => entry.row === station)),
      columns: [FACTORY_COLUMN],
    },
  };
}

export function listOpenWeakPoints(
  allEngaged: readonly EngagedWeakPoint[],
): readonly EngagedWeakPoint[] {
  return allEngaged.filter((weakPoint) => !weakPoint.isClosed);
}

export function countCurrentWeek(series: readonly WeeklyCount[]): number | null {
  const current = series.at(-1);
  return current === undefined ? null : current.count;
}

export function describeWeakPointMeta(
  weakPoint: EngagedWeakPoint,
  series: readonly WeeklyCount[],
): string {
  const total = series.reduce((sum, week) => sum + week.count, 0);
  return `${weakPoint.map} map · engaged on ${weakPoint.engagedOn} · ${String(total)} occurrence(s) recorded · countermeasure: ${weakPoint.countermeasure}`;
}

export function describeCurrentWeek(series: readonly WeeklyCount[]): string {
  const current = series.at(-1);
  const currentText =
    current === undefined
      ? NO_OCCURRENCE
      : `${String(current.count)} in the week of ${current.weekStart}`;
  return `${currentText}. Target: zero per week.`;
}

export function renderWeeklyBars(series: readonly WeeklyCount[]): string {
  const highest = Math.max(1, ...series.map((week) => week.count));
  const bars = series.map((week) => {
    const height = Math.round((week.count / highest) * PERCENT);
    const zero = week.count === 0 ? ' zero' : '';
    return `<span class="bar${zero}" style="height:${String(height)}%" title="week of ${week.weekStart}: ${String(week.count)}"></span>`;
  });
  return `<div class="bars">${bars.join('')}</div>`;
}

export function renderEngagedWeakPoints(
  allEngaged: readonly EngagedWeakPoint[],
  weeklyCounts: ReadonlyMap<string, readonly WeeklyCount[]>,
): string {
  const engaged = listOpenWeakPoints(allEngaged);
  if (engaged.length === 0) return '<p>No weak point is engaged.</p>';
  return engaged
    .map((weakPoint) => {
      const series = weeklyCounts.get(weakPoint.id) ?? [];
      return `<h3>${escapeHtml(weakPoint.title)} <code>${escapeHtml(weakPoint.id)}</code></h3>
<p>${escapeHtml(describeWeakPointMeta(weakPoint, series))}</p>
${renderWeeklyBars(series)}<p>${escapeHtml(describeCurrentWeek(series))}</p>`;
    })
    .join('\n');
}

export function renderStageLegend(): string {
  const entries = [
    ...STAGES.map((stage) => ({
      dotClass: `stage-${stage.toLowerCase()}`,
      note: `${stage}: ${STAGE_MEANINGS[stage]}`,
    })),
    { dotClass: '', note: 'no stage recorded' },
    { dotClass: 'engaged', note: 'engaged weak point' },
  ];
  const items = entries.map((entry) => {
    const classes = ['dot', entry.dotClass].filter((name) => name !== '').join(' ');
    return `<span><span class="${classes}"></span> ${escapeHtml(entry.note)}</span>`;
  });
  return `<div class="legend">${items.join('')}</div>`;
}

export function renderVaricelle(placed: readonly PlacedDot[], now: string): string {
  const { product, factory } = splitDefectMaps(placed);
  return `${renderStageLegend()}
<h3>${PRODUCT_MAP_TITLE}</h3>
<p>${PRODUCT_MAP_NOTE}</p>
${renderGrid(product.placed, product.rows, product.columns, now)}
<h3>${FACTORY_MAP_TITLE}</h3>
<p>${FACTORY_MAP_NOTE}</p>
${renderGrid(factory.placed, factory.rows, factory.columns, now)}`;
}

function renderRecurrences(recurrences: readonly Recurrence[]): string {
  if (recurrences.length === 0)
    return '<p>No entry names an earlier one in <code>recurs:</code>.</p>';
  const items = recurrences.map((recurrence) => {
    const links = recurrence.slugs.map(
      (slug) => `<a href="${DANTOTSU_ADDRESS}${slug}.md">${escapeHtml(slug)}</a>`,
    );
    return `<li><strong>${String(recurrence.slugs.length)} entries</strong>, ${recurrence.firstDate} to ${recurrence.lastDate}: ${links.join(' → ')}</li>`;
  });
  return `<ol>${items.join('')}</ol>`;
}

export function renderWeakPointPage(input: WeakPointPageInput): string {
  return renderQualityPage(
    'Weak points',
    `<p>Generated by scripts/quality/weak-points.ts on ${input.now} from ${String(input.placed.length)} dantotsus. One dot per defect, placed at the <code>zone:</code> its entry names and coloured by the stage that caught it. A full dot is under ${String(RECENT_DAYS)} days old; a ringed dot belongs to an engaged weak point. Hover a dot for its date and title.</p>
<h2>Engaged weak points</h2>
${renderEngagedWeakPoints(input.engaged, input.weeklyCounts)}
<h2>Defect map</h2>
${renderVaricelle(input.placed, input.now)}
<h2>Recurrences</h2>
<p>Entries joined through <code>recurs:</code>, largest group first. A group that keeps growing is a class the eradications did not close.</p>
${renderRecurrences(input.recurrences)}`,
  );
}
