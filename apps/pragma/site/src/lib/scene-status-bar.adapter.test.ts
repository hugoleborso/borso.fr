import { afterEach, describe, expect, it } from 'vitest';
import { paintStatusBarLikeSceneWhileAttached } from './scene-status-bar.adapter';

const STAGE_BACKGROUND = 'rgb(13, 10, 7)';
const LIGHT_PAPER = '#f5f1e8';
const DARK_PAPER = '#16130f';

function themeColour(scheme: string, content: string): HTMLMetaElement {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.media = `(prefers-color-scheme: ${scheme})`;
  meta.content = content;
  document.head.append(meta);
  return meta;
}

function stageScene(): HTMLElement {
  const scene = document.createElement('dialog');
  scene.style.backgroundColor = STAGE_BACKGROUND;
  document.body.append(scene);
  return scene;
}

describe('the status bar while the scene is open', () => {
  afterEach(() => {
    paintStatusBarLikeSceneWhileAttached(null);
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it('takes the scene background in both colour schemes', () => {
    const light = themeColour('light', LIGHT_PAPER);
    const dark = themeColour('dark', DARK_PAPER);

    paintStatusBarLikeSceneWhileAttached(stageScene());

    expect(light.getAttribute('content')).toBe(STAGE_BACKGROUND);
    expect(dark.getAttribute('content')).toBe(STAGE_BACKGROUND);
  });

  it('gets back the paper colours once the scene closes', () => {
    const light = themeColour('light', LIGHT_PAPER);
    const dark = themeColour('dark', DARK_PAPER);
    paintStatusBarLikeSceneWhileAttached(stageScene());

    paintStatusBarLikeSceneWhileAttached(null);

    expect(light.getAttribute('content')).toBe(LIGHT_PAPER);
    expect(dark.getAttribute('content')).toBe(DARK_PAPER);
    expect(light.dataset.paperContent).toBeUndefined();
  });

  it('keeps the paper colours when a second scene opens before the first closes', () => {
    const light = themeColour('light', LIGHT_PAPER);
    paintStatusBarLikeSceneWhileAttached(stageScene());
    paintStatusBarLikeSceneWhileAttached(stageScene());

    paintStatusBarLikeSceneWhileAttached(null);

    expect(light.getAttribute('content')).toBe(LIGHT_PAPER);
  });
});
