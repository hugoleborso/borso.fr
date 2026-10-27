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

export interface TaskMetricsOptions {
  readonly taskIds: readonly string[];
  readonly measureRoutes: boolean;
  readonly measureSliceOne: boolean;
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

export function parseTaskMetricsArguments(argumentList: readonly string[]): TaskMetricsOptions {
  return {
    taskIds: listRequestedTaskIds(readOptionValue(argumentList, '--tasks')),
    measureRoutes: argumentList.includes('--routes'),
    measureSliceOne: argumentList.includes('--slice-1'),
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
