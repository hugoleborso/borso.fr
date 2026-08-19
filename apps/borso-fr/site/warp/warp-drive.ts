/**
 * The lightspeed jump between two pages of borso.fr.
 *
 * A click on an internal link is held for the length of the animation, an
 * overlay of streaking trails is drawn over the page, and the browser is sent
 * to the destination once the field has bloomed. The overlay is plain DOM
 * driven by the keyframes in `site/styles/tokens.css`, so the compositor owns
 * every frame and no script runs while the page is leaving.
 *
 * One delegated listener covers the whole document, which is what lets the
 * three built pages opt in with a single call each.
 */
import { isModifiedClick, selectNavigationMode } from './warp-navigation.core';
import {
  WARP_DURATION_MILLISECONDS,
  WARP_STREAK_COUNT,
  buildWarpStreaks,
  selectJumpStyleProperties,
  selectStreakStyleProperties,
} from './warp-streaks.core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const OVERLAY_CLASS_NAME = 'fixed inset-0 z-[9999] overflow-hidden';
const VEIL_CLASS_NAME = 'absolute inset-0 bg-apex-bg animate-warp-veil';
const STREAK_CLASS_NAME =
  'absolute top-1/2 left-1/2 mt-[calc(var(--warp-thickness)/-2)] h-[var(--warp-thickness)] w-[var(--warp-length)] origin-left rounded-full bg-[linear-gradient(90deg,transparent,var(--warp-color))] animate-warp-streak';
const FLASH_CLASS_NAME =
  'absolute top-1/2 left-1/2 h-[80vmax] w-[80vmax] rounded-full bg-[radial-gradient(circle,var(--color-warp-core)_0%,var(--color-warp-core)_22%,var(--color-warp-glow)_48%,transparent_78%)] animate-warp-flash';

/** The overlay outlives the click that made it, and only one jump can be in flight. */
const warpDrive: { overlay: HTMLElement | null } = { overlay: null };

function applyStyleProperties(
  element: HTMLElement,
  properties: Readonly<Record<string, string>>,
): void {
  for (const [property, value] of Object.entries(properties)) {
    element.style.setProperty(property, value);
  }
}

function buildOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS_NAME;
  overlay.setAttribute('aria-hidden', 'true');

  const veil = document.createElement('div');
  veil.className = VEIL_CLASS_NAME;
  applyStyleProperties(veil, selectJumpStyleProperties());
  overlay.append(veil);

  for (const streak of buildWarpStreaks(WARP_STREAK_COUNT, Math.random)) {
    const trail = document.createElement('span');
    trail.className = STREAK_CLASS_NAME;
    applyStyleProperties(trail, selectStreakStyleProperties(streak));
    overlay.append(trail);
  }

  const flash = document.createElement('div');
  flash.className = FLASH_CLASS_NAME;
  applyStyleProperties(flash, selectJumpStyleProperties());
  overlay.append(flash);

  return overlay;
}

function engageWarp(destinationHref: string): void {
  const overlay = buildOverlay();
  warpDrive.overlay = overlay;
  document.body.append(overlay);
  window.setTimeout(() => {
    window.location.assign(destinationHref);
  }, WARP_DURATION_MILLISECONDS);
}

/**
 * A page restored from the back-forward cache comes back with the overlay
 * still on it, which would leave the reader looking at a black screen.
 */
function clearWarp(): void {
  warpDrive.overlay?.remove();
  warpDrive.overlay = null;
}

function warpBeforeNavigation(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  if (warpDrive.overlay !== null) return;

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
  engageWarp(link.href);
}

// @FollowsBlueprint browser-edge-module
export function installWarpDrive(): void {
  document.addEventListener('click', warpBeforeNavigation);
  window.addEventListener('pageshow', clearWarp);
}
