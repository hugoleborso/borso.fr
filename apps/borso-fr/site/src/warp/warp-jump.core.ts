/**
 * How hard the galaxy is flying at a given moment of a lightspeed jump.
 *
 * The shader already draws a starfield the viewer is travelling through:
 * `uStarSpeed` is the distance travelled so far, and each layer's scale is
 * derived from it, so stars grow and sweep past as it climbs. A jump is
 * therefore not a new effect drawn over the page — it is the same galaxy with
 * its travel rate and its glow taken up, and the numbers for that are here.
 */

export interface JumpIntensity {
  /** Multiplies the galaxy's cruising star speed. */
  readonly starSpeedMultiplier: number;
  /** Multiplies the galaxy's cruising glow, which lengthens the rays on each star. */
  readonly glowMultiplier: number;
}

/** How long the galaxy accelerates before the browser is sent to the destination. */
export const JUMP_DURATION_MILLISECONDS = 800;

const CRUISING: JumpIntensity = { starSpeedMultiplier: 1, glowMultiplier: 1 };

/*
 * The shader carries a star from far to near over one cycle of
 * `uStarSpeed * uSpeed`, so the field sweeps at `starSpeed * multiplier / 10 *
 * speed` cycles a second. The galaxy's own settings put cruising at 0.036 of a
 * cycle a second, a star drifting across in half a minute; 120 takes that to
 * 4.3, a star crossing in 0.23 s, which is a sweep the eye reads as travel and
 * still thirteen frames long at 60 Hz. Raise it far past this and a star
 * crosses in fewer frames than it takes to read one as moving, and the jump
 * turns into a flicker.
 *
 * This is the number to move if the jump feels wrong; nothing else depends on
 * it.
 */
const TOP_STAR_SPEED_MULTIPLIER = 120;
const TOP_GLOW_MULTIPLIER = 1.9;

/**
 * Squared, so the galaxy answers the click straight away and still spends most
 * of its speed at the end. A cube leaves the first half of the jump looking
 * like nothing has happened.
 *
 * Clamped rather than guarded: squaring turns a reading from before the jump
 * into a positive one, and the frames between the last one and the navigation
 * ask for a time past the end.
 */
function selectJumpProgress(elapsedMilliseconds: number): number {
  const linearProgress = Math.min(Math.max(elapsedMilliseconds / JUMP_DURATION_MILLISECONDS, 0), 1);
  return linearProgress * linearProgress;
}

function selectJumpIntensity(elapsedMilliseconds: number): JumpIntensity {
  const progress = selectJumpProgress(elapsedMilliseconds);
  return {
    starSpeedMultiplier: 1 + progress * (TOP_STAR_SPEED_MULTIPLIER - 1),
    glowMultiplier: 1 + progress * (TOP_GLOW_MULTIPLIER - 1),
  };
}

/**
 * The whole reading, from the two values the store holds: when the jump began,
 * or `null` while the galaxy is only cruising, and what time it is now.
 */
export function selectIntensityAt(
  startedAtMilliseconds: number | null,
  nowMilliseconds: number,
): JumpIntensity {
  if (startedAtMilliseconds === null) return CRUISING;
  return selectJumpIntensity(nowMilliseconds - startedAtMilliseconds);
}
