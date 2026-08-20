export interface JumpIntensity {
  readonly starSpeedMultiplier: number;
  readonly glowMultiplier: number;
}

export const JUMP_DURATION_MILLISECONDS = 800;

export const PAGE_FADE_DURATION_MILLISECONDS = 420;

const CRUISING: JumpIntensity = { starSpeedMultiplier: 1, glowMultiplier: 1 };

const TOP_STAR_SPEED_MULTIPLIER = 200;
const TOP_GLOW_MULTIPLIER = 2.1;

const HIGHEST_PROGRESS = 1.6;

function selectJumpProgress(elapsedMilliseconds: number): number {
  const linearProgress = Math.max(elapsedMilliseconds / JUMP_DURATION_MILLISECONDS, 0);
  return Math.min(linearProgress * linearProgress, HIGHEST_PROGRESS);
}

function selectJumpIntensity(elapsedMilliseconds: number): JumpIntensity {
  const progress = selectJumpProgress(elapsedMilliseconds);
  return {
    starSpeedMultiplier: 1 + progress * (TOP_STAR_SPEED_MULTIPLIER - 1),
    glowMultiplier: 1 + progress * (TOP_GLOW_MULTIPLIER - 1),
  };
}

export function selectIntensityAt(
  startedAtMilliseconds: number | null,
  nowMilliseconds: number,
): JumpIntensity {
  if (startedAtMilliseconds === null) return CRUISING;
  return selectJumpIntensity(nowMilliseconds - startedAtMilliseconds);
}
