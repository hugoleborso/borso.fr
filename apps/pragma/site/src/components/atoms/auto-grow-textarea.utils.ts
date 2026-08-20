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
