/**
 * The lightspeed jump the galaxy makes before the browser leaves the page.
 *
 * The click on an internal link is held, the galaxy's own travel rate and glow
 * are taken up until the stars are sweeping past, and the browser is sent to
 * the destination at the top of that acceleration. Nothing is drawn over the
 * page: the effect is the background that was already there, flying.
 */
import { JUMP_DURATION_MILLISECONDS } from './warp-jump.core';
import { beginJump, endJump, isJumping } from './warp-jump.store';
import { isModifiedClick, selectNavigationMode } from './warp-navigation.core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function engageJump(destinationHref: string): void {
  beginJump(performance.now());
  window.setTimeout(() => {
    window.location.assign(destinationHref);
  }, JUMP_DURATION_MILLISECONDS);
}

/**
 * A page restored from the back-forward cache comes back mid-jump, with the
 * galaxy still at full speed and nothing left to navigate to.
 */
function settleGalaxy(): void {
  endJump();
}

function jumpBeforeNavigation(event: MouseEvent): void {
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
  engageJump(link.href);
}

// @FollowsBlueprint browser-edge-module
export function installWarpDrive(): void {
  document.addEventListener('click', jumpBeforeNavigation);
  window.addEventListener('pageshow', settleGalaxy);
}
