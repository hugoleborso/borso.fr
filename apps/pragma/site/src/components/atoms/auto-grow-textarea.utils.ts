/**
 * How tall an auto-growing textarea is allowed to be, and whether it has to
 * scroll what it cannot show.
 *
 * Growing to the content keeps the page the only scroller, which is what a
 * short note wants. A ChordPro chart is not a short note: thirty-eight lines
 * measured 3424 px, which pushed Save and Delete seven screens down a phone.
 * So the box grows to its content up to a share of the viewport, and past that
 * it becomes a scroll region of its own — a nested scroll on the one field
 * where the alternative is a twelve-screen form.
 *
 * The floor keeps the cap usable when the viewport is tiny or unknown (0 in a
 * non-browser render), so the box never collapses to nothing.
 */

const VIEWPORT_SHARE = 0.55;
const MINIMUM_CAP_PX = 220;

export interface AutoGrowBox {
  readonly heightPx: number;
  readonly overflowY: 'hidden' | 'auto';
}

// @FollowsBlueprint utils-pure-module
export function measureAutoGrowBox(contentHeightPx: number, viewportHeightPx: number): AutoGrowBox {
  const capPx = Math.max(MINIMUM_CAP_PX, Math.round(viewportHeightPx * VIEWPORT_SHARE));
  const isCapped = contentHeightPx > capPx;
  return {
    heightPx: isCapped ? capPx : contentHeightPx,
    overflowY: isCapped ? 'auto' : 'hidden',
  };
}
