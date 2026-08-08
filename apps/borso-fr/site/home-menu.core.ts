const MENU_STAGGER_BASE_MS = 80;
const MENU_STAGGER_STEP_MS = 60;
const NO_TRANSITION_DELAY = '0ms';

/** The items fan out when the menu opens and snap back together when it closes. */
export function selectMenuItemTransitionDelay(isMenuOpen: boolean, itemIndex: number): string {
  if (!isMenuOpen) return NO_TRANSITION_DELAY;
  return `${MENU_STAGGER_BASE_MS + itemIndex * MENU_STAGGER_STEP_MS}ms`;
}

const ESCAPE_KEY = 'Escape';

/**
 * Escape closes the menu, except while the dialog is open, where the browser
 * gives Escape to the dialog instead.
 */
export function isMenuOpenAfterKey(
  key: string,
  isMenuOpen: boolean,
  isDialogOpen: boolean,
): boolean {
  if (key !== ESCAPE_KEY) return isMenuOpen;
  if (isDialogOpen) return isMenuOpen;
  return false;
}

/** The entry under `home.menu` in the catalogue that names the burger's action. */
export type BurgerLabelKey = 'open-label' | 'close-label';

const BURGER_LABEL_KEY: Readonly<Record<`${boolean}`, BurgerLabelKey>> = {
  true: 'close-label',
  false: 'open-label',
};

export function selectBurgerLabelKey(isMenuOpen: boolean): BurgerLabelKey {
  return BURGER_LABEL_KEY[`${isMenuOpen}`];
}

const HIDDEN_VISIBILITY = 'hidden';

/**
 * A tab that loads in the background never gets an animation tick, so it would
 * be stuck at zero opacity. Such a tab keeps the title at full opacity instead.
 */
export function canAnimateIn(visibilityState: string, isReducedMotionPreferred: boolean): boolean {
  return visibilityState !== HIDDEN_VISIBILITY && !isReducedMotionPreferred;
}
