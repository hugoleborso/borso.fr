/**
 * Where a pointer on the energy bar lands, when a gesture over it is a drag
 * rather than a scroll, and where a key moves it.
 *
 * The bar draws one segment per level, so a pointer picks the segment it fell
 * in. A range input maps the same gesture through its thumb instead, which
 * gives the two end levels half a segment each and puts every boundary half a
 * step away from the tick the eye aims at — on a phone that is a control
 * nobody lands on the first try.
 *
 * `isDragIntent` is what separates a slide along the bar from a page scroll
 * that started on it. A finger travelling further sideways than down, past a
 * threshold a hand cannot hold still under, is a slide; everything else is the
 * page's gesture and the bar must not write on it.
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

/**
 * Wide enough that a thumb resting on the bar does not cross it, narrow enough
 * that a deliberate slide crosses it before the finger reaches the next
 * segment.
 */
const DRAG_INTENT_TRAVEL_PX = 8;

function clampLevel(level: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(level, minimum), maximum);
}

// @FollowsBlueprint utils-pure-module
export function buildEnergyLevels(minimum: number, maximum: number): readonly number[] {
  return Array.from({ length: maximum - minimum + 1 }, (_unused, index) => minimum + index);
}

/**
 * The level a pointer at `ratio` of the bar's width picks, or `null` when the
 * bar has no width to measure against: a control that cannot locate the
 * pointer writes nothing rather than the value at one of its ends.
 */
// @FollowsBlueprint utils-pure-module
export function levelFromPointerRatio(
  ratio: number,
  minimum: number,
  maximum: number,
): number | null {
  if (!Number.isFinite(ratio)) return null;
  const levelCount = maximum - minimum + 1;
  return clampLevel(minimum + Math.floor(ratio * levelCount), minimum, maximum);
}

// @FollowsBlueprint utils-pure-module
export function isDragIntent(horizontalTravel: number, verticalTravel: number): boolean {
  const sideways = Math.abs(horizontalTravel);
  return sideways >= DRAG_INTENT_TRAVEL_PX && sideways > Math.abs(verticalTravel);
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
