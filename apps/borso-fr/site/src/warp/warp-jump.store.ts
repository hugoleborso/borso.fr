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

export function readJumpIntensity(nowMilliseconds: number): JumpIntensity {
  return selectIntensityAt(jump.startedAtMilliseconds, nowMilliseconds);
}
