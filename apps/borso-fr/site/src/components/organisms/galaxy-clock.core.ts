const MILLISECONDS_PER_SECOND = 1000;
const STAR_SPEED_DIVISOR = 10;

export interface StarClock {
  elapsedSeconds: number;
  travelledDistance: number;
}

const LONGEST_CHARGED_FRAME_SECONDS = 0.1;

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

export function easeTowards(current: number, target: number): number {
  return current + (target - current) * POINTER_LERP_FACTOR;
}
