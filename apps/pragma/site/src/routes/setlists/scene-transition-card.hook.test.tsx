import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { type SceneTransitionCardView, useSceneTransitionCard } from './scene-transition-card.hook';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderHook(): {
  readonly read: () => SceneTransitionCardView;
  readonly unmount: () => void;
} {
  let latest: SceneTransitionCardView | null = null;
  function Probe(): null {
    latest = useSceneTransitionCard();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Probe />));
  return {
    read: () => {
      if (latest === null) throw new TypeError('the hook never rendered');
      return latest;
    },
    unmount: () => act(() => root.unmount()),
  };
}

// @FollowsBlueprint test-component-render
describe('useSceneTransitionCard', () => {
  it('keeps the strip showing in a browser without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    Reflect.deleteProperty(window, 'IntersectionObserver');
    const hook = renderHook();
    expect(hook.read().attachCard(document.createElement('section'))).toBeUndefined();
    expect(hook.read().isCardInView).toBe(false);
    hook.unmount();
    vi.unstubAllGlobals();
  });
});
