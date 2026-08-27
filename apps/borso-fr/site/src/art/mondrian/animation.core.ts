const ANIMATION_MODES = ['still', 'drift', 'breathe', 'cascade'] as const;

export type AnimationMode = (typeof ANIMATION_MODES)[number];

export const ANIMATION_MODE_LIST: readonly AnimationMode[] = ANIMATION_MODES;

const ANIMATION_MODE_SET: ReadonlySet<string> = new Set(ANIMATION_MODES);

export function isAnimationMode(value: string): value is AnimationMode {
  return ANIMATION_MODE_SET.has(value);
}

export type CanvasTransform = 'none' | 'drift' | 'breathe';

const TRANSFORM_BY_REDUCED_MOTION: Readonly<
  Record<`${boolean}`, Readonly<Record<AnimationMode, CanvasTransform>>>
> = {
  true: { still: 'none', drift: 'none', breathe: 'none', cascade: 'none' },
  false: { still: 'none', drift: 'drift', breathe: 'breathe', cascade: 'none' },
};

// @FollowsBlueprint core-lookup-table
export function selectCanvasTransform(
  mode: AnimationMode,
  isReducedMotion: boolean,
): CanvasTransform {
  return TRANSFORM_BY_REDUCED_MOTION[`${isReducedMotion}`][mode];
}

const STATIC_TRANSFORM: CanvasTransform = 'none';

export function isTransformAnimated(transform: CanvasTransform): boolean {
  return transform !== STATIC_TRANSFORM;
}

const CASCADE_MODE: AnimationMode = 'cascade';

export function isCascadeMode(mode: AnimationMode, isReducedMotion: boolean): boolean {
  return mode === CASCADE_MODE && !isReducedMotion;
}

export interface InkbloomAnimation {
  name: string;
  durationMs: number;
}

const INKBLOOM_ANIMATION: Readonly<Record<`${boolean}`, InkbloomAnimation>> = {
  true: { name: 'inkbloom-reduced', durationMs: 180 },
  false: { name: 'inkbloom', durationMs: 700 },
};

export function selectInkbloomAnimation(isReducedMotion: boolean): InkbloomAnimation {
  return INKBLOOM_ANIMATION[`${isReducedMotion}`];
}

const INKBLOOM_STAGGER_TOTAL_MS = 600;
const INKBLOOM_JITTER_SPREAD_MS = 80;
const INKBLOOM_JITTER_STRIDE = 37;
const NO_DELAY_MS = 0;

export interface InkbloomDelayRequest {
  readonly rectangleIndex: number;
  readonly rectangleCount: number;
  readonly rectangleId: number;
  readonly isReducedMotion: boolean;
}

export function selectInkbloomDelayMs({
  rectangleIndex,
  rectangleCount,
  rectangleId,
  isReducedMotion,
}: InkbloomDelayRequest): number {
  if (isReducedMotion) return NO_DELAY_MS;
  if (rectangleCount === 0) return NO_DELAY_MS;
  const stagger = (rectangleIndex / rectangleCount) * INKBLOOM_STAGGER_TOTAL_MS;
  const jitter = (rectangleId * INKBLOOM_JITTER_STRIDE) % INKBLOOM_JITTER_SPREAD_MS;
  return stagger + jitter;
}
