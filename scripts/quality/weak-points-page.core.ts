import {
  FACTORY_STATIONS,
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
function daysBetween(earlier: string, later: string): number {
  return (Date.parse(later) - Date.parse(earlier)) / MILLISECONDS_PER_DAY;
}

function renderDot(dot: DefectDot, now: string): string {
  const classes = ['dot'];
  if (daysBetween(dot.date, now) <= RECENT_DAYS) classes.push('recent');
  if (dot.weakPoint !== null) classes.push('engaged');
  const label = `${dot.date} · ${dot.title}`;
  return `<a class="${classes.join(' ')}" href="${DANTOTSU_ADDRESS}${dot.slug}.md" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></a>`;
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

function renderWeeklySeries(series: readonly WeeklyCount[]): string {
  const highest = Math.max(1, ...series.map((week) => week.count));
  const bars = series.map((week) => {
    const height = Math.round((week.count / highest) * 100);
    const zero = week.count === 0 ? ' zero' : '';
    return `<span class="bar${zero}" style="height:${String(height)}%" title="week of ${week.weekStart}: ${String(week.count)}"></span>`;
  });
  const current = series.at(-1);
  const currentText =
    current === undefined
      ? 'no occurrence yet'
      : `${String(current.count)} in the week of ${current.weekStart}`;
  return `<div class="bars">${bars.join('')}</div><p>${escapeHtml(currentText)}. Target: zero per week.</p>`;
}

function renderEngaged(input: WeakPointPageInput): string {
  const engaged = input.engaged.filter((weakPoint) => !weakPoint.isClosed);
  if (engaged.length === 0) return '<p>No weak point is engaged.</p>';
  return engaged
    .map((weakPoint) => {
      const series = input.weeklyCounts.get(weakPoint.id) ?? [];
      const total = series.reduce((sum, week) => sum + week.count, 0);
      return `<h3>${escapeHtml(weakPoint.title)} <code>${escapeHtml(weakPoint.id)}</code></h3>
<p>${escapeHtml(weakPoint.map)} map · engaged on ${escapeHtml(weakPoint.engagedOn)} · ${String(total)} occurrence(s) recorded · countermeasure: ${escapeHtml(weakPoint.countermeasure)}</p>
${renderWeeklySeries(series)}`;
    })
    .join('\n');
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
  const product = input.placed.filter((entry) => entry.map === 'product');
  const factory = input.placed.filter((entry) => entry.map === 'factory');
  const productRows = orderByCount(product.map((entry) => entry.row));
  const productColumns = orderByCount(product.map((entry) => entry.column));
  const factoryRows = FACTORY_STATIONS.filter((station) =>
    factory.some((entry) => entry.row === station),
  );
  return renderQualityPage(
    'Weak points',
    `<p>Generated by scripts/quality/weak-points.ts on ${input.now} from ${String(input.placed.length)} dantotsus. One dot per defect, placed at the <code>zone:</code> its entry names. A full dot is under ${String(RECENT_DAYS)} days old; an orange dot belongs to an engaged weak point. Hover a dot for its date and title.</p>
<h2>Engaged weak points</h2>
${renderEngaged(input)}
<h2>Product map</h2>
<p>Applications and infrastructure packages by layer, the layer read from the path the way the blueprint scripts read it.</p>
${renderGrid(product, productRows, productColumns, input.now)}
<h2>Factory map</h2>
<p>The stations of the line that builds the product: the skills, the gates, the hooks, CI and the deploy.</p>
${renderGrid(factory, factoryRows, [FACTORY_COLUMN], input.now)}
<h2>Recurrences</h2>
<p>Entries joined through <code>recurs:</code>, largest group first. A group that keeps growing is a class the eradications did not close.</p>
${renderRecurrences(input.recurrences)}`,
  );
}
