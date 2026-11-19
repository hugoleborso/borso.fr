import { z } from 'zod';
import {
  parseTapPoint,
  readFlag,
  readNumberFlag,
  type RecordedInputEvent,
  type TapPoint,
} from './touch-tap.core';

export const TOUCH_DRAG_BINDING = '__touchDragReport';

const dragEndsSchema = z.object({ from: z.unknown(), to: z.unknown() });

export interface DragEnds {
  readonly from: TapPoint | null;
  readonly to: TapPoint | null;
}

export function parseDragEnds(value: unknown): DragEnds {
  const ends = dragEndsSchema.parse(value);
  return { from: parseTapPoint(ends.from), to: parseTapPoint(ends.to) };
}

// @FollowsBlueprint utils-pure-module
export function interpolateDragPath(from: TapPoint, to: TapPoint, steps: number): TapPoint[] {
  return Array.from({ length: steps }, (_unused, index) => {
    const progress = (index + 1) / steps;
    return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
  });
}

export function resolveDragEnd(ends: DragEnds, offset: TapPoint | null): TapPoint | null {
  if (offset === null || ends.from === null) return ends.to;
  return { x: ends.from.x + offset.x, y: ends.from.y + offset.y };
}

const OFFSET_PATTERN = /^(-?\d+),(-?\d+)$/;

export function parseDragOffset(text: string | undefined): TapPoint | null {
  const match = OFFSET_PATTERN.exec(String(text));
  if (match === null) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}

export function isOverDestination(value: unknown): boolean {
  return z.boolean().parse(value);
}

export interface TouchDragVerdict {
  readonly isRealDrag: boolean;
  readonly problems: readonly string[];
}

function hasEvent(
  events: readonly RecordedInputEvent[],
  type: string,
  requiresTarget: boolean,
): boolean {
  return events.some((event) => event.type === type && (event.isOnTarget || !requiresTarget));
}

export function judgeTouchDrag(
  events: readonly RecordedInputEvent[],
  isLiftOverDestination: boolean,
  isSwipe = false,
): TouchDragVerdict {
  const isPanCancelFatal = hasEvent(events, 'pointercancel', false) && !isSwipe;
  const problems = [
    hasEvent(events, 'touchstart', true) ? null : 'no touchstart reached the from element',
    hasEvent(events, 'touchmove', false) ? null : 'no touchmove fired',
    hasEvent(events, 'touchend', false) ? null : 'no touchend fired',
    isPanCancelFatal
      ? 'the browser cancelled the touch to pan or zoom, so the page did not hold the drag'
      : null,
    isLiftOverDestination ? null : 'the touch did not lift over the to element',
  ].filter((problem): problem is string => problem !== null);
  return { isRealDrag: problems.length === 0, problems };
}

export interface TouchDragOptions {
  readonly fromSelector: string;
  readonly toSelector: string;
  readonly offset: TapPoint | null;
  readonly steps: number;
  readonly port: number;
  readonly pageUrlPart: string;
  readonly width: number;
  readonly height: number;
}

const DEFAULT_OPTIONS: Omit<TouchDragOptions, 'fromSelector' | 'toSelector' | 'offset'> = {
  steps: 8,
  port: 9222,
  pageUrlPart: '',
  width: 375,
  height: 812,
};

export function parseTouchDragArguments(
  argumentsGiven: readonly string[],
): TouchDragOptions | null {
  const fromSelector = readFlag(argumentsGiven, 'from') ?? '';
  const toSelector = readFlag(argumentsGiven, 'to') ?? '';
  const offset = parseDragOffset(readFlag(argumentsGiven, 'by'));
  const hasOneDestination = toSelector.length > 0 !== (offset !== null);
  if (fromSelector.length === 0 || !hasOneDestination) return null;
  return {
    fromSelector,
    toSelector,
    offset,
    steps: readNumberFlag(argumentsGiven, 'steps', DEFAULT_OPTIONS.steps),
    port: readNumberFlag(argumentsGiven, 'port', DEFAULT_OPTIONS.port),
    pageUrlPart: readFlag(argumentsGiven, 'page') ?? DEFAULT_OPTIONS.pageUrlPart,
    width: readNumberFlag(argumentsGiven, 'width', DEFAULT_OPTIONS.width),
    height: readNumberFlag(argumentsGiven, 'height', DEFAULT_OPTIONS.height),
  };
}
