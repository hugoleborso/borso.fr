/**
 * Where a tap on the energy bar lands, and where a key moves it.
 *
 * The bar draws one segment per level, so a pointer picks the segment it fell
 * in. A range input maps the same gesture through its thumb instead, which
 * gives the two end levels half a segment each and puts every boundary half a
 * step away from the tick the eye aims at — on a phone that is a control
 * nobody lands on the first try.
 * @Feature setlists
 */

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
export function levelFromPointerRatio(ratio: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(ratio)) return minimum;
  const levelCount = maximum - minimum + 1;
  return clampLevel(minimum + Math.floor(ratio * levelCount), minimum, maximum);
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
