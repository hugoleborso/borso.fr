const MILLISECONDS_PER_SECOND = 1000;
const STAR_SPEED_DIVISOR = 10;

export interface StarClock {
  elapsedSeconds: number;
  travelledDistance: number;
}

/**
 * A frame longer than this is a tab that was in the background, not a slow
 * machine. Its distance is charged at this rate instead, so coming back does
 * not teleport the starfield.
 */
const LONGEST_CHARGED_FRAME_SECONDS = 0.1;

/**
 * Distance is accumulated frame by frame rather than read off the elapsed
 * time, which is what lets `starSpeed` change mid-flight: the lightspeed jump
 * multiplies it by more than a hundred, and a distance derived from the clock
 * would jump by the same factor in one frame and tear the starfield.
 *
 * A paused galaxy keeps the reading it already had, so the stars hold their
 * position instead of jumping when animation resumes.
 */
// @FollowsBlueprint core-view-projection
export function selectStarClock(
  isAnimationPaused: boolean,
  timestamp: number,
  starSpeed: number,
  previousClock: StarClock,
): StarClock {
  if (isAnimationPaused) return previousClock;
  const elapsedSeconds = timestamp / MILLISECONDS_PER_SECOND;
  const chargedSeconds = Math.min(
    elapsedSeconds - previousClock.elapsedSeconds,
    LONGEST_CHARGED_FRAME_SECONDS,
  );
  return {
    elapsedSeconds,
    travelledDistance:
      previousClock.travelledDistance + (chargedSeconds * starSpeed) / STAR_SPEED_DIVISOR,
  };
}

const POINTER_LERP_FACTOR = 0.05;

/** Eases the shader's pointer towards where the pointer actually is. */
export function easeTowards(current: number, target: number): number {
  return current + (target - current) * POINTER_LERP_FACTOR;
}
