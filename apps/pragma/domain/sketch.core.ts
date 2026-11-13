export const SKETCH_TIMELINE_START_SECONDS = 0;

export const SKETCH_OFFSET_LAST_SECOND = 24 * 60 * 60;

export const SKETCH_TAIL_SECONDS = 30;

// @FollowsBlueprint core-decision
export function snapOffsetSeconds(rawSeconds: number): number {
  const wholeSeconds = Math.round(rawSeconds);
  return Math.min(SKETCH_OFFSET_LAST_SECOND, Math.max(SKETCH_TIMELINE_START_SECONDS, wholeSeconds));
}

export function selectTimelineLengthSeconds(clipEnds: readonly number[]): number {
  return Math.max(SKETCH_TIMELINE_START_SECONDS, ...clipEnds) + SKETCH_TAIL_SECONDS;
}

export const SKETCH_REFUSALS = [
  'song-not-found',
  'lane-not-found',
  'inspiration-not-found',
  'clip-not-found',
] as const;

export type SketchRefusal = (typeof SKETCH_REFUSALS)[number];
