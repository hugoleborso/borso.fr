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

/**
 * The same hold for a page with no galaxy, which fades instead. Shorter,
 * because a fade has nothing to build up to and the whole of it is the wait.
 * It lives here so every length a click is held for is one file.
 */
export const PAGE_FADE_DURATION_MILLISECONDS = 420;

const CRUISING: JumpIntensity = { starSpeedMultiplier: 1, glowMultiplier: 1 };

/*
 * The shader carries a star from far to near over one cycle of
 * `uStarSpeed * uSpeed`, so the field sweeps at `starSpeed * multiplier / 10 *
 * speed` cycles a second. The galaxy's own settings put cruising at 0.036 of a
 * cycle a second, a star drifting across in half a minute; 200 takes that to
 * 7.2, a star crossing in 0.14 s, eight frames at 60 Hz.
 *
 * This is the number to move if the jump feels wrong. The sibling test pins it,
 * so it changes in two places.
 */
const TOP_STAR_SPEED_MULTIPLIER = 200;
const TOP_GLOW_MULTIPLIER = 2.1;

/**
 * The jump does not stop building when the browser is asked to leave, because
 * the page is still on screen until the destination answers. It keeps
 * accelerating on the same curve, so a slow destination flies faster rather
 * than sitting at one speed, and stops here: at this much progress a star
 * crosses in five frames at 60 Hz, and past it the field turns over faster
 * than the eye reads a single star as moving, which is flicker rather than
 * speed.
 *
 * Just over a quarter again the length of the jump, so an ordinary navigation
 * never reaches it.
 */
const HIGHEST_PROGRESS = 1.6;

/**
 * Squared, so the galaxy answers the click straight away and still spends most
 * of its speed at the end. A cube leaves the first half of the jump looking
 * like nothing has happened.
 *
 * The floor is what stops a reading from before the jump being squared into a
 * positive one.
 */
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
