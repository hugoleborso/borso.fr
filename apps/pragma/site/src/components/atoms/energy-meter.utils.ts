/** @Feature setlists */

const PIXELS_PER_LEVEL = 32;
const SHORTEST_BAR_RATIO = 0.28;

function clampLevel(level: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(level, minimum), maximum);
}

// @FollowsBlueprint utils-pure-module
export function levelFromTravel(
  startLevel: number,
  horizontalTravel: number,
  minimum: number,
  maximum: number,
): number | null {
  if (!Number.isFinite(horizontalTravel)) return null;
  const stepped = startLevel + Math.round(horizontalTravel / PIXELS_PER_LEVEL);
  return clampLevel(stepped, minimum, maximum);
}

// @FollowsBlueprint utils-pure-module
export function barHeightRatio(level: number, minimum: number, maximum: number): number {
  if (maximum <= minimum) return 1;
  const position = (level - minimum) / (maximum - minimum);
  return SHORTEST_BAR_RATIO + (1 - SHORTEST_BAR_RATIO) * position;
}
