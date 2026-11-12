export const OPENING_COIN_SIZE_PX = 150;
export const OPENING_COIN_TOP_RATIO = 0.42;

export interface DockTargetBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface DockMove {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

const HALF = 0.5;
const REVEAL_ANIMATION = 'opening-reveal';
const DOCK_ANIMATION = 'opening-dock';

export const SHRINK_IN_PLACE: DockMove = { x: 0, y: 0, scale: 0 };

// @FollowsBlueprint core-view-projection
export function computeDockMove(target: DockTargetBox | null, viewport: ViewportSize): DockMove {
  if (target === null) return SHRINK_IN_PLACE;
  return {
    x: target.left + target.width * HALF - viewport.width * HALF,
    y: target.top + target.height * HALF - viewport.height * OPENING_COIN_TOP_RATIO,
    scale: target.width / OPENING_COIN_SIZE_PX,
  };
}

export function shouldPlayOpening(
  hasPlayedThisSession: boolean,
  isMotionReduced: boolean,
): boolean {
  return !hasPlayedThisSession && !isMotionReduced;
}

export function isDockAimingAnimation(animationName: string): boolean {
  return animationName === REVEAL_ANIMATION || animationName === DOCK_ANIMATION;
}

export function isLandingAnimation(animationName: string): boolean {
  return animationName === DOCK_ANIMATION;
}
