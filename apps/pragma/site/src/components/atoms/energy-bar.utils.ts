/** @Feature setlists */

const STEP_BY_KEY: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
};

const HOME_KEY = 'Home';
const END_KEY = 'End';

function clampLevel(level: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(level, minimum), maximum);
}

// @FollowsBlueprint utils-pure-module
export function buildEnergyLevels(minimum: number, maximum: number): readonly number[] {
  return Array.from({ length: maximum - minimum + 1 }, (_unused, index) => minimum + index);
}

// @FollowsBlueprint utils-pure-module
export function levelFromKey(
  key: string,
  current: number,
  minimum: number,
  maximum: number,
): number | null {
  if (key === HOME_KEY) return minimum;
  if (key === END_KEY) return maximum;
  const step = STEP_BY_KEY[key];
  if (step === undefined) return null;
  return clampLevel(current + step, minimum, maximum);
}
