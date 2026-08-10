const MILLISECONDS_PER_SECOND = 1000;
const STAR_SPEED_DIVISOR = 10;

export interface StarClock {
  elapsedSeconds: number;
  travelledDistance: number;
}

/**
 * A paused galaxy keeps the reading it already had, so the stars hold their
 * position instead of jumping when animation resumes.
 */
export function selectStarClock(
  isAnimationPaused: boolean,
  timestamp: number,
  starSpeed: number,
  previousClock: StarClock,
): StarClock {
  if (isAnimationPaused) return previousClock;
  const elapsedSeconds = timestamp / MILLISECONDS_PER_SECOND;
  return {
    elapsedSeconds,
    travelledDistance: (elapsedSeconds * starSpeed) / STAR_SPEED_DIVISOR,
  };
}

const POINTER_LERP_FACTOR = 0.05;

/** Eases the shader's pointer towards where the pointer actually is. */
export function easeTowards(current: number, target: number): number {
  return current + (target - current) * POINTER_LERP_FACTOR;
}
