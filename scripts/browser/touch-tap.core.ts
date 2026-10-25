export interface RecordedInputEvent {
  readonly type: string;
  readonly pointerType: string;
  readonly isOnTarget: boolean;
}

export interface TouchTapVerdict {
  readonly isRealTouch: boolean;
  readonly problems: readonly string[];
}

const TOUCH_POINTER = 'touch';

function hasEvent(
  events: readonly RecordedInputEvent[],
  type: string,
  pointerType: string | null,
): boolean {
  return events.some(
    (event) =>
      event.isOnTarget &&
      event.type === type &&
      (pointerType === null || event.pointerType === pointerType),
  );
}

export function judgeTouchTap(events: readonly RecordedInputEvent[]): TouchTapVerdict {
  const problems = [
    hasEvent(events, 'touchstart', null) ? null : 'no touchstart reached the target',
    hasEvent(events, 'pointerdown', TOUCH_POINTER)
      ? null
      : 'no pointerdown with pointerType touch reached the target',
    hasEvent(events, 'click', TOUCH_POINTER)
      ? null
      : 'no click with pointerType touch reached the target',
  ].filter((problem): problem is string => problem !== null);
  return { isRealTouch: problems.length === 0, problems };
}

export interface TouchTapOptions {
  readonly selector: string;
  readonly port: number;
  readonly pageUrlPart: string;
  readonly width: number;
  readonly height: number;
}

const DEFAULT_OPTIONS: Omit<TouchTapOptions, 'selector'> = {
  port: 9222,
  pageUrlPart: '',
  width: 375,
  height: 812,
};

function readFlag(argumentsGiven: readonly string[], name: string): string | undefined {
  const flagIndex = argumentsGiven.indexOf(`--${name}`);
  return flagIndex === -1 ? undefined : argumentsGiven[flagIndex + 1];
}

function readNumberFlag(argumentsGiven: readonly string[], name: string, fallback: number): number {
  const given = Number(readFlag(argumentsGiven, name) ?? Number.NaN);
  return Number.isInteger(given) && given > 0 ? given : fallback;
}

export function parseTouchTapArguments(argumentsGiven: readonly string[]): TouchTapOptions | null {
  const selector = readFlag(argumentsGiven, 'selector');
  if (selector === undefined || selector.length === 0) return null;
  return {
    selector,
    port: readNumberFlag(argumentsGiven, 'port', DEFAULT_OPTIONS.port),
    pageUrlPart: readFlag(argumentsGiven, 'page') ?? DEFAULT_OPTIONS.pageUrlPart,
    width: readNumberFlag(argumentsGiven, 'width', DEFAULT_OPTIONS.width),
    height: readNumberFlag(argumentsGiven, 'height', DEFAULT_OPTIONS.height),
  };
}
