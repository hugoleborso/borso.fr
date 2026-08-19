/**
 * The one value the galaxy's animation frame and the link that started the
 * jump both need. It cannot be React state: the galaxy's frame loop runs
 * inside the effect that owns the WebGL context, and a state change would
 * re-run that effect and rebuild the context mid-jump.
 */
import { selectIntensityAt, type JumpIntensity } from './warp-jump.core';

const NOT_JUMPING = null;

const jump: { startedAtMilliseconds: number | null } = { startedAtMilliseconds: NOT_JUMPING };

export function beginJump(nowMilliseconds: number): void {
  jump.startedAtMilliseconds = nowMilliseconds;
}

export function endJump(): void {
  jump.startedAtMilliseconds = NOT_JUMPING;
}

export function isJumping(): boolean {
  return jump.startedAtMilliseconds !== NOT_JUMPING;
}

/**
 * Called once per animation frame, with the frame's own timestamp, so the
 * galaxy and the jump share one clock.
 */
export function readJumpIntensity(nowMilliseconds: number): JumpIntensity {
  return selectIntensityAt(jump.startedAtMilliseconds, nowMilliseconds);
}
