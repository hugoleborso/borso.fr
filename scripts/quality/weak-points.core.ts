import {
  readField,
  readListValue,
  stripQuotes,
  type DantotsuDocument,
} from './dantotsu-record.core';
import { requireAt } from './require-at.core';

export interface DefectDot {
  readonly slug: string;
  readonly title: string;
  readonly date: string;
  readonly zone: string;
  readonly weakPoint: string | null;
  readonly recurs: readonly string[];
}

export interface EngagedWeakPoint {
  readonly id: string;
  readonly title: string;
  readonly map: string;
  readonly engagedOn: string;
  readonly countermeasure: string;
  readonly isClosed: boolean;
}

export interface WeeklyCount {
  readonly weekStart: string;
  readonly count: number;
}

export interface Recurrence {
  readonly slugs: readonly string[];
  readonly firstDate: string;
  readonly lastDate: string;
}

export const FACTORY_STATIONS: readonly string[] = [
  'spec',
  'plan',
  'implementation',
  'validation',
  'gates',
  'ci',
  'deploy',
  'hooks',
  'skills',
  'harness',
];

const STATION_BY_PATH_PREFIX: readonly (readonly [string, string])[] = [
  ['plugins/borso-harness/skills/specification', 'spec'],
  ['plugins/borso-harness/skills/technical-conception', 'plan'],
  ['plugins/borso-harness/skills/adr', 'plan'],
  ['docs/adr', 'plan'],
  ['plugins/borso-harness/skills/implementation', 'implementation'],
  ['plugins/borso-harness/skills/technical-validation', 'validation'],
  ['plugins/borso-harness/skills/visual-validation', 'validation'],
  ['plugins/borso-harness/skills/standards-review', 'validation'],
  ['plugins/borso-harness/agents', 'validation'],
  ['scripts/browser.sh', 'validation'],
  ['scripts/argent.sh', 'validation'],
  ['.github/workflows/deploy.yml', 'deploy'],
  ['.github/workflows/preview.yml', 'deploy'],
  ['.github/workflows/cleanup-orphans.yml', 'deploy'],
  ['.github/workflows/shared-deploy.yml', 'deploy'],
  ['scripts/preflight-', 'deploy'],
  ['.github/', 'ci'],
  ['.husky/', 'gates'],
  ['eslint-rules', 'gates'],
  ['eslint.config.js', 'gates'],
  ['scripts/check-', 'gates'],
  ['scripts/standards/', 'gates'],
  ['scripts/docs/', 'gates'],
  ['scripts/vitest-', 'gates'],
  ['stryker', 'gates'],
  ['.prettierignore', 'gates'],
  ['knip.json', 'gates'],
  ['tsconfig.json', 'gates'],
  ['plugins/borso-harness/hooks', 'hooks'],
  ['.claude/hooks', 'hooks'],
  ['.claude/settings.json', 'hooks'],
  ['plugins/borso-harness/skills', 'skills'],
  ['plugins/borso-harness/commands', 'skills'],
];
const DEFAULT_STATION = 'harness';
const PRODUCT_PATH_PATTERN = /^(apps|infra)\/([^/]+)\/?([^/]*)/;
const PROJECT_SEGMENTS: ReadonlySet<string> = new Set(['site', 'api', 'cdk', 'domain']);
const TEST_PATH_PATTERN = /(^|\/)test(\/|$)|\.test\.[jt]sx?$/;
const UNKNOWN_LAYER = 'unknown';
const WORKSPACE_COLUMN = 'workspace';
const TEST_COLUMN = 'test';
const TABLE_ROW_PATTERN = /^\|\s*`([a-z0-9-]+)`\s*\|(.*)\|\s*$/;
const ENGAGED_COLUMNS = 4;
const CLOSED_HEADING_PATTERN = /^##\s+Closed\b/;
const MILLISECONDS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const MONDAY_OFFSET_FROM_THURSDAY_EPOCH = 3;
const ISO_DATE_LENGTH = 10;

export function readDefectDot(document: DantotsuDocument): DefectDot | null {
  const date = readField(document, 'date');
  const zone = readField(document, 'zone');
  if (date === undefined || zone === undefined) return null;
  const weakPoint = readField(document, 'weak-point');
  return {
    slug: document.slug,
    title: document.title,
    date,
    zone: stripQuotes(zone),
    weakPoint: weakPoint === undefined ? null : stripQuotes(weakPoint),
    recurs: readListValue(readField(document, 'recurs')) ?? [],
  };
}

export function readEngagedWeakPoints(markdown: string): readonly EngagedWeakPoint[] {
  const engaged: EngagedWeakPoint[] = [];
  let isUnderClosedHeading = false;
  for (const line of markdown.split('\n')) {
    if (CLOSED_HEADING_PATTERN.test(line)) isUnderClosedHeading = true;
    const row = TABLE_ROW_PATTERN.exec(line);
    if (row === null) continue;
    const cells = requireAt(row, 2)
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length < ENGAGED_COLUMNS) continue;
    engaged.push({
      id: requireAt(row, 1),
      title: requireAt(cells, 0),
      map: requireAt(cells, 1),
      engagedOn: requireAt(cells, 2),
      countermeasure: requireAt(cells, 3),
      isClosed: isUnderClosedHeading,
    });
  }
  return engaged;
}

export function selectStation(zone: string): string {
  const match = STATION_BY_PATH_PREFIX.find(([prefix]) => zone.startsWith(prefix));
  return match === undefined ? DEFAULT_STATION : match[1];
}

export function placeOnProductMap(
  zone: string,
  inferLayer: (path: string) => string,
): { readonly row: string; readonly column: string } | null {
  const product = PRODUCT_PATH_PATTERN.exec(zone);
  if (product === null) return null;
  const row = `${requireAt(product, 1)}/${requireAt(product, 2)}`;
  if (TEST_PATH_PATTERN.test(zone)) return { row, column: TEST_COLUMN };
  const layer = inferLayer(zone);
  if (layer !== UNKNOWN_LAYER) return { row, column: layer };
  const segment = requireAt(product, 3);
  return { row, column: PROJECT_SEGMENTS.has(segment) ? segment : WORKSPACE_COLUMN };
}

function dayNumber(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / MILLISECONDS_PER_DAY);
}

function isoDateOfDay(day: number): string {
  return new Date(day * MILLISECONDS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
}

export function startOfWeek(isoDate: string): string {
  const day = dayNumber(isoDate);
  const daysSinceMonday =
    (((day + MONDAY_OFFSET_FROM_THURSDAY_EPOCH) % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return isoDateOfDay(day - daysSinceMonday);
}

export function countWeeklyOccurrences(
  dots: readonly DefectDot[],
  weakPointId: string,
  now: string,
): readonly WeeklyCount[] {
  const dates = dots.filter((dot) => dot.weakPoint === weakPointId).map((dot) => dot.date);
  if (dates.length === 0) return [];
  const counts = new Map<string, number>();
  for (const date of dates) {
    const week = startOfWeek(date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  const series: WeeklyCount[] = [];
  const lastWeek = dayNumber(startOfWeek(now));
  const firstWeek = dayNumber(startOfWeek(requireAt(dates.toSorted(), 0)));
  for (let week = firstWeek; week <= lastWeek; week += DAYS_PER_WEEK) {
    const weekStart = isoDateOfDay(week);
    series.push({ weekStart, count: counts.get(weekStart) ?? 0 });
  }
  return series;
}

export function groupRecurrences(dots: readonly DefectDot[]): readonly Recurrence[] {
  const dotsBySlug = new Map(dots.map((dot) => [dot.slug, dot]));
  const parent = new Map<string, string>();
  const findRoot = (slug: string): string => {
    let root = slug;
    for (let next = parent.get(root); next !== undefined; next = parent.get(root)) root = next;
    return root;
  };
  const linked = new Set<string>();
  for (const dot of dots) {
    for (const earlier of dot.recurs.filter((slug) => dotsBySlug.has(slug))) {
      linked.add(dot.slug).add(earlier);
      const first = findRoot(dot.slug);
      const second = findRoot(earlier);
      if (first !== second) parent.set(first, second);
    }
  }
  const members = new Map<string, DefectDot[]>();
  for (const dot of dots.filter((candidate) => linked.has(candidate.slug))) {
    const root = findRoot(dot.slug);
    members.set(root, [...(members.get(root) ?? []), dot]);
  }
  return [...members.values()]
    .map((group) => group.toSorted((first, second) => first.date.localeCompare(second.date)))
    .map((group) => ({
      slugs: group.map((dot) => dot.slug),
      firstDate: requireAt(group, 0).date,
      lastDate: requireAt(group, group.length - 1).date,
    }))
    .toSorted(
      (first, second) =>
        second.slugs.length - first.slugs.length || first.firstDate.localeCompare(second.firstDate),
    );
}

export function selectUnresolvedReferences(
  dots: readonly DefectDot[],
  trackedPaths: ReadonlySet<string>,
  engaged: readonly EngagedWeakPoint[],
): readonly string[] {
  const engagedIds = new Set(engaged.map((weakPoint) => weakPoint.id));
  const problems: string[] = [];
  for (const dot of dots) {
    if (!trackedPaths.has(dot.zone)) {
      problems.push(`${dot.slug}: zone ${dot.zone} names no path in the repository`);
    }
    if (dot.weakPoint !== null && !engagedIds.has(dot.weakPoint)) {
      problems.push(
        `${dot.slug}: weak-point ${dot.weakPoint} is not listed in docs/quality/weak-points.md`,
      );
    }
  }
  return problems;
}
