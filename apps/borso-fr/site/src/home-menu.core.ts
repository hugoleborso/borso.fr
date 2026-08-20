const MENU_STAGGER_BASE_MS = 80;
const MENU_STAGGER_STEP_MS = 60;
const NO_TRANSITION_DELAY = '0ms';

export function selectMenuItemTransitionDelay(isMenuOpen: boolean, itemIndex: number): string {
  if (!isMenuOpen) return NO_TRANSITION_DELAY;
  return `${MENU_STAGGER_BASE_MS + itemIndex * MENU_STAGGER_STEP_MS}ms`;
}

const ESCAPE_KEY = 'Escape';

export function isMenuOpenAfterKey(
  key: string,
  isMenuOpen: boolean,
  isDialogOpen: boolean,
): boolean {
  if (key !== ESCAPE_KEY) return isMenuOpen;
  if (isDialogOpen) return isMenuOpen;
  return false;
}

export type BurgerLabelKey = 'open-label' | 'close-label';

const BURGER_LABEL_KEY: Readonly<Record<`${boolean}`, BurgerLabelKey>> = {
  true: 'close-label',
  false: 'open-label',
};

// @FollowsBlueprint core-view-intent
export function selectBurgerLabelKey(isMenuOpen: boolean): BurgerLabelKey {
  return BURGER_LABEL_KEY[`${isMenuOpen}`];
}

const HIDDEN_VISIBILITY = 'hidden';

export function canAnimateIn(visibilityState: string, isReducedMotionPreferred: boolean): boolean {
  return visibilityState !== HIDDEN_VISIBILITY && !isReducedMotionPreferred;
}
