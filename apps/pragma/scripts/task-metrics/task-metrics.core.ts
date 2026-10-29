const SCREEN_THIRDS = 3;
export const BOTTOM_THIRD_FROM = (SCREEN_THIRDS - 1) / SCREEN_THIRDS;
export const ALL_TASK_IDS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '8b',
] as const;
export const COMPARED_FIELDS = ['taps', 'textEntries', 'scrollGestures', 'screensVisited'] as const;

const MAXIMUM_SCROLL_SHARE = 0.7;
const MINIMUM_SCROLL_SHARE = 0.05;
const NUDGE_SCROLL_SHARE = 0.15;
const PAGE_SCROLL_X_SHARE = 0.5;
const PAGE_SCROLL_Y_SHARE = 0.45;
const HALF = 2;
const POSITION_DECIMALS = 3;
const IDENTIFIER_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const IDENTIFIER_PLACEHOLDER = ':id';

export type ComparedField = (typeof COMPARED_FIELDS)[number];

export const SEED_VARIANTS = ['audit', 'no-upcoming-session'] as const;

export type SeedVariant = (typeof SEED_VARIANTS)[number];

export interface TaskMetricsOptions {
  readonly taskIds: readonly string[];
  readonly measureRoutes: boolean;
  readonly measureSliceOne: boolean;
  readonly measureSliceTwo: boolean;
  readonly measureSliceThree: boolean;
  readonly measureSliceFour: boolean;
  readonly measureSliceSix: boolean;
  readonly measureScreenRule: boolean;
  readonly seedVariant: SeedVariant;
  readonly outputPath: string | null;
  readonly baselinePath: string | null;
}

export interface FoundTarget {
  readonly centreX: number;
  readonly centreY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly screenTop: number;
  readonly screenLeft: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly visibleTop: number;
  readonly visibleBottom: number;
  readonly hittable: boolean;
  readonly inView: boolean;
  readonly container: { readonly rect: readonly number[] } | null;
}

export interface ScrollGesturePlan {
  readonly point: { readonly x: number; readonly y: number };
  readonly deltaY: number;
}

function readOptionValue(argumentList: readonly string[], name: string): string | null {
  const position = argumentList.indexOf(name);
  return position < 0 ? null : (argumentList[position + 1] ?? null);
}

export function listRequestedTaskIds(requested: string | null): readonly string[] {
  if (requested === null || requested === 'all') return ALL_TASK_IDS;
  if (requested === 'none') return [];
  return requested.split(',').filter((taskId) => taskId.length > 0);
}

function isSeedVariant(value: string): value is SeedVariant {
  return SEED_VARIANTS.some((variant) => variant === value);
}

export function parseSeedVariant(requested: string | null): SeedVariant {
  if (requested === null) return 'audit';
  if (isSeedVariant(requested)) return requested;
  throw new Error(`unknown seed ${requested}; expected one of ${SEED_VARIANTS.join(', ')}`);
}

export function parseTaskMetricsArguments(argumentList: readonly string[]): TaskMetricsOptions {
  return {
    taskIds: listRequestedTaskIds(readOptionValue(argumentList, '--tasks')),
    measureRoutes: argumentList.includes('--routes'),
    measureSliceOne: argumentList.includes('--slice-1'),
    measureSliceTwo: argumentList.includes('--slice-2'),
    measureSliceThree: argumentList.includes('--slice-3'),
    measureSliceFour: argumentList.includes('--slice-4'),
    measureSliceSix: argumentList.includes('--slice-6'),
    measureScreenRule: argumentList.includes('--screen-rule') || argumentList.includes('--routes'),
    seedVariant: parseSeedVariant(readOptionValue(argumentList, '--seed')),
    outputPath: readOptionValue(argumentList, '--out'),
    baselinePath: readOptionValue(argumentList, '--compare'),
  };
}

export function projectTapPoint(target: FoundTarget): { x: number; y: number } {
  return {
    x: (target.centreX - target.screenLeft) / target.viewportWidth,
    y: (target.centreY - target.screenTop) / target.viewportHeight,
  };
}

function measureScreenFraction(target: FoundTarget): number {
  return (target.centreY - target.screenTop) / target.screenHeight;
}

export function projectScreenFraction(target: FoundTarget): number {
  return Number(measureScreenFraction(target).toFixed(POSITION_DECIMALS));
}

export function isInBottomThird(target: FoundTarget): boolean {
  return target.inView && measureScreenFraction(target) >= BOTTOM_THIRD_FROM;
}

function clampScrollShare(share: number): number {
  return Math.max(-MAXIMUM_SCROLL_SHARE, Math.min(MAXIMUM_SCROLL_SHARE, share));
}

export function planScrollGesture(target: FoundTarget): ScrollGesturePlan {
  const visibleMiddle = (target.visibleTop + target.visibleBottom) / HALF;
  const containerRect = target.container?.rect;
  const point =
    containerRect === undefined
      ? {
          x: (target.screenWidth * PAGE_SCROLL_X_SHARE) / target.viewportWidth,
          y: (target.screenHeight * PAGE_SCROLL_Y_SHARE) / target.viewportHeight,
        }
      : {
          x:
            ((containerRect[0] ?? 0) + (containerRect[2] ?? 0) / HALF - target.screenLeft) /
            target.viewportWidth,
          y: (visibleMiddle - target.screenTop) / target.viewportHeight,
        };
  const distance = (target.centreY - visibleMiddle) / target.screenHeight;
  const isNudgeNeeded = !target.hittable && Math.abs(distance) < MINIMUM_SCROLL_SHARE;
  return { point, deltaY: clampScrollShare(isNudgeNeeded ? NUDGE_SCROLL_SHARE : distance) };
}

export function replaceIdentifiers(value: unknown): unknown {
  const parsed: unknown = JSON.parse(
    JSON.stringify(value).replace(IDENTIFIER_PATTERN, IDENTIFIER_PLACEHOLDER),
  );
  return parsed;
}

export function replaceIdentifierInPath(path: string): string {
  return path.replace(IDENTIFIER_PATTERN, IDENTIFIER_PLACEHOLDER);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTaskRecord(source: unknown, taskId: string): Record<string, unknown> | null {
  if (!isRecord(source) || !isRecord(source.tasks)) return null;
  const task = source.tasks[taskId];
  return isRecord(task) ? task : null;
}

export function listBaselineDifferences(
  current: unknown,
  baseline: unknown,
  taskIds: readonly string[],
): string[] {
  const differences: string[] = [];
  for (const taskId of taskIds) {
    const measured = readTaskRecord(current, taskId);
    const expected = readTaskRecord(baseline, taskId);
    if (expected === null) {
      differences.push(`task ${taskId}: not in the baseline`);
      continue;
    }
    if (measured === null || typeof measured.failed === 'string') {
      const failure = typeof measured?.failed === 'string' ? measured.failed : 'not measured';
      differences.push(`task ${taskId}: failed (${failure})`);
      continue;
    }
    for (const field of COMPARED_FIELDS) {
      if (measured[field] !== expected[field]) {
        differences.push(
          `task ${taskId}: ${field} ${String(measured[field])} (baseline ${String(expected[field])})`,
        );
      }
    }
  }
  return differences;
}

export function describeTaskCounts(summary: unknown): string {
  if (!isRecord(summary)) return 'no summary';
  return COMPARED_FIELDS.map((field) => `${field}=${String(summary[field])}`).join(' ');
}

const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_FIRST_SHIFT = 15;
const MULBERRY_SECOND_SHIFT = 7;
const MULBERRY_THIRD_SHIFT = 14;
const MULBERRY_MULTIPLIER = 61;
const UNSIGNED_RANGE = 4_294_967_296;
const SCENE_ROUTE_SUFFIX = '/scene';

export function buildDelaySequence(seed: number, count: number, maximumMs: number): number[] {
  let state = seed >>> 0;
  const delays: number[] = [];
  for (let index = 0; index < count; index += 1) {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let mixed = Math.imul(state ^ (state >>> MULBERRY_FIRST_SHIFT), state | 1);
    mixed ^=
      mixed + Math.imul(mixed ^ (mixed >>> MULBERRY_SECOND_SHIFT), mixed | MULBERRY_MULTIPLIER);
    const fraction = ((mixed ^ (mixed >>> MULBERRY_THIRD_SHIFT)) >>> 0) / UNSIGNED_RANGE;
    delays.push(Math.round(fraction * maximumMs));
  }
  return delays;
}

export function isSceneRoute(route: string): boolean {
  return route.endsWith(SCENE_ROUTE_SUFFIX);
}

export interface RouteFontSizes {
  readonly route: string;
  readonly fontSizes: readonly string[];
}

export function listDistinctFontSizes(routes: readonly RouteFontSizes[]): string[] {
  const sizes = new Set<string>();
  for (const route of routes) {
    if (isSceneRoute(route.route)) continue;
    for (const size of route.fontSizes) sizes.add(size);
  }
  return [...sizes].sort((first, second) => Number.parseFloat(first) - Number.parseFloat(second));
}

export function countFullTextRuns(
  runs: readonly { readonly stored: string | null; readonly shown: string | null }[],
): number {
  return runs.filter((run) => run.stored !== null && run.stored === run.shown).length;
}

export function sumCounts(counts: readonly number[]): number {
  return counts.reduce((total, count) => total + count, 0);
}

export function summariseRouteButtons(routes: unknown): Record<string, number> {
  const totals = { routes: 0, buttons: 0, textOnlyButtons: 0, iconOnlyButtonsWithoutName: 0 };
  if (!isRecord(routes) || !Array.isArray(routes.routes)) return totals;
  for (const route of routes.routes) {
    if (!isRecord(route) || !isRecord(route.buttons)) continue;
    totals.routes += 1;
    totals.buttons += Number(route.buttons.total ?? 0);
    totals.textOnlyButtons += Number(route.buttons.textNoIcon ?? 0);
    totals.iconOnlyButtonsWithoutName += Number(route.iconOnlyButtonsWithoutName ?? 0);
  }
  return totals;
}

export function isSameBox(first: readonly number[], second: readonly number[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

export interface SchemeCounts {
  readonly light: { readonly count: number };
  readonly dark: { readonly count: number };
}

export function sumSchemeCounts(measures: readonly SchemeCounts[]): {
  light: number;
  dark: number;
  total: number;
} {
  const light = sumCounts(measures.map((measure) => measure.light.count));
  const dark = sumCounts(measures.map((measure) => measure.dark.count));
  return { light, dark, total: light + dark };
}

const DIGIT_PATTERN = /\d/;

export function countTextsWithDigits(texts: readonly string[]): number {
  return texts.filter((text) => DIGIT_PATTERN.test(text)).length;
}

export function selectLongestTitle<Song extends { readonly title: string }>(
  songs: readonly Song[],
): Song | null {
  return songs.reduce<Song | null>(
    (longest, song) =>
      longest === null || song.title.length > longest.title.length ? song : longest,
    null,
  );
}

const RECORDING_SHEET_LABEL_START = 'Recording ';

export function describeScreenKey(path: string, overlay: string | null): string {
  if (overlay === null || overlay.startsWith(RECORDING_SHEET_LABEL_START)) return path;
  return `${path} + [${overlay}]`;
}
