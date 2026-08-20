import { PAGE_FADE_DURATION_MILLISECONDS } from './warp-jump.core';
import { beginJump, endJump, isJumping } from './warp-jump.store';
import { isModifiedClick, selectNavigationMode } from './warp-navigation.core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const JUMPING_BODY_CLASS = 'jumping';

const HOLD_DURATION_CUSTOM_PROPERTY = '--transition-hold';

function publishHoldDurationToStylesheet(holdMilliseconds: number): void {
  document.documentElement.style.setProperty(
    HOLD_DURATION_CUSTOM_PROPERTY,
    `${holdMilliseconds}ms`,
  );
}

function engageJump(destinationHref: string, holdMilliseconds: number): void {
  document.body.classList.add(JUMPING_BODY_CLASS);
  beginJump(performance.now());
  window.setTimeout(() => {
    window.location.assign(destinationHref);
  }, holdMilliseconds);
}

function settleJumpOnPageRestore(): void {
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
  publishHoldDurationToStylesheet(holdMilliseconds);
  document.addEventListener('click', (event) => {
    jumpBeforeNavigation(event, holdMilliseconds);
  });
  window.addEventListener('pageshow', settleJumpOnPageRestore);
}
