/**
 * The transition every page of borso.fr plays before the browser leaves it.
 *
 * The click on an internal link is held, the page performs its own departure,
 * and the browser is sent on at the end of it. On the landing page that is the
 * galaxy taking its own travel rate and glow up until the stars sweep past; on
 * a page with no galaxy it is the page fading. Nothing is drawn over either:
 * the effect is what was already there, leaving.
 *
 * How long the click is held is the caller's, because the two transitions are
 * not the same length. The stylesheet reads it back off `--transition-hold`,
 * so the fade and the navigation cannot drift apart.
 */
import { PAGE_FADE_DURATION_MILLISECONDS } from './warp-jump.core';
import { beginJump, endJump, isJumping } from './warp-jump.store';
import { isModifiedClick, selectNavigationMode } from './warp-navigation.core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Carried on `body` for the length of the jump. `site/index.html` reads it to
 * fade the menu and its button out of the way, so the galaxy is what the
 * reader is looking at while it flies.
 */
const JUMPING_BODY_CLASS = 'jumping';

const HOLD_CUSTOM_PROPERTY = '--transition-hold';

function engageJump(destinationHref: string, holdMilliseconds: number): void {
  document.body.classList.add(JUMPING_BODY_CLASS);
  beginJump(performance.now());
  window.setTimeout(() => {
    window.location.assign(destinationHref);
  }, holdMilliseconds);
}

/**
 * A page restored from the back-forward cache comes back mid-jump, with the
 * galaxy still at full speed and nothing left to navigate to.
 */
function settleGalaxy(): void {
  document.body.classList.remove(JUMPING_BODY_CLASS);
  endJump();
}

function jumpBeforeNavigation(event: MouseEvent, holdMilliseconds: number): void {
  if (event.defaultPrevented) return;
  if (isJumping()) return;

  const { target } = event;
  if (!(target instanceof Element)) return;

  const link = target.closest('a');
  if (link === null) return;

  const mode = selectNavigationMode({
    destinationHref: link.href,
    currentHref: window.location.href,
    linkTarget: link.target,
    isDownloadLink: link.hasAttribute('download'),
    isModifiedClick: isModifiedClick(event),
    isReducedMotionPreferred: window.matchMedia(REDUCED_MOTION_QUERY).matches,
  });
  if (mode === 'browser') return;

  event.preventDefault();
  engageJump(link.href, holdMilliseconds);
}

// @FollowsBlueprint browser-edge-module
export function installWarpDrive(holdMilliseconds = PAGE_FADE_DURATION_MILLISECONDS): void {
  document.documentElement.style.setProperty(HOLD_CUSTOM_PROPERTY, `${holdMilliseconds}ms`);
  document.addEventListener('click', (event) => {
    jumpBeforeNavigation(event, holdMilliseconds);
  });
  window.addEventListener('pageshow', settleGalaxy);
}
