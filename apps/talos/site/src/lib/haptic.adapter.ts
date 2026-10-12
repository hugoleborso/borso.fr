/** @DependsOnExternal browser-vibration */

const PULSE_MS = 12;

// @FollowsBlueprint browser-clipboard-write
export function pulseHaptic(): void {
  if (typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(PULSE_MS);
}
