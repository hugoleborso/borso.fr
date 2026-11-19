/** @Feature songs */

const THEME_COLOUR_SELECTOR = 'meta[name="theme-color"][content]';

function restoreStatusBar(): void {
  for (const meta of document.querySelectorAll<HTMLMetaElement>(THEME_COLOUR_SELECTOR)) {
    const paperContent = meta.dataset.paperContent;
    if (paperContent === undefined) continue;
    meta.content = paperContent;
    delete meta.dataset.paperContent;
  }
}

// @FollowsBlueprint ref-callback-browser-api
export function paintStatusBarLikeSceneWhileAttached(scene: HTMLElement | null): void {
  restoreStatusBar();
  if (scene === null) return;
  const sceneBackground = getComputedStyle(scene).backgroundColor;
  for (const meta of document.querySelectorAll<HTMLMetaElement>(THEME_COLOUR_SELECTOR)) {
    meta.dataset.paperContent = meta.content;
    meta.content = sceneBackground;
  }
}
