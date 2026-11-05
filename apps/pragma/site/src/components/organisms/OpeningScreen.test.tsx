import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { OpeningScreen, type OpeningScreenProps } from './OpeningScreen';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LOADING_EN = 'Tuning up…';
const FAILED_EN = "pragma could not reach the band's data.";
const OFFLINE_EN = 'You are offline.';
const RETRY_EN = 'Try again';
const JSDOM_ANIMATION_EVENT_TYPES = {
  start: 'webkitAnimationStart',
  end: 'webkitAnimationEnd',
} as const;

function ignoreAnimation(): void {
  return undefined;
}

function screenProps(overrides: Partial<OpeningScreenProps>): OpeningScreenProps {
  return {
    phase: 'opening',
    connectionNote: 'online',
    onRetry: vi.fn(),
    onAnimationStart: ignoreAnimation,
    onAnimationEnd: ignoreAnimation,
    ...overrides,
  };
}

function readStatus(): string {
  return document.querySelector('[role=status]')?.textContent ?? '';
}

function findButton(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find((button) => button.textContent === name);
}

function readOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-opening-phase]');
}

// @FollowsBlueprint test-component-render
describe('OpeningScreen', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderScreen(overrides: Partial<OpeningScreenProps>): void {
    act(() => {
      root.render(<OpeningScreen {...screenProps(overrides)} />);
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('announces that the band is tuning up while the mark moves, with no button', () => {
    renderScreen({ phase: 'opening' });
    expect(readStatus()).toBe(LOADING_EN);
    expect(document.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('svg')?.dataset.motion).toBe('playing');
    expect(document.querySelectorAll('button')).toHaveLength(0);
  });

  it('draws the four groups of the mark and three keys that press alone', () => {
    renderScreen({ phase: 'opening' });
    const parts = [...document.querySelectorAll<SVGGElement>('[data-mark-part]')].map(
      (part) => part.dataset.markPart,
    );
    expect(parts).toEqual(['halo', 'echo', 'left-note', 'keys', 'right-note']);
    expect(document.querySelectorAll('[data-mark-key]')).toHaveLength(3);
  });

  it('says the band data could not be reached, stills the mark and offers a retry', () => {
    const onRetry = vi.fn();
    renderScreen({ phase: 'opening-failed', onRetry });
    expect(readStatus()).toBe(FAILED_EN);
    expect(document.querySelector('svg')?.dataset.motion).toBe('still');
    const retry = findButton(RETRY_EN);
    act(() => {
      retry?.click();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('adds that the browser is offline when it is', () => {
    renderScreen({ phase: 'opening-failed', connectionNote: 'offline' });
    expect(readStatus()).toBe(`${FAILED_EN}${OFFLINE_EN}`);
  });

  it('keeps the mark out of sight while the saved cache restores', () => {
    renderScreen({ phase: 'restoring' });
    expect(readOverlay()?.firstElementChild?.className).toContain('hidden');
  });

  it('hides the leaving overlay from assistive technology and lets taps through', () => {
    renderScreen({ phase: 'leaving' });
    expect(readOverlay()?.getAttribute('aria-hidden')).toBe('true');
    expect(readOverlay()?.className).toContain('pointer-events-none');
  });

  it('hands every animation that starts or ends inside it to its owner', () => {
    const onAnimationStart = vi.fn();
    const onAnimationEnd = vi.fn();
    renderScreen({ phase: 'opening', onAnimationStart, onAnimationEnd });
    const leftNote = document.querySelector('[data-mark-part=left-note]');
    if (leftNote === null) throw new Error('no left note');
    act(() => {
      leftNote.dispatchEvent(new Event(JSDOM_ANIMATION_EVENT_TYPES.start, { bubbles: true }));
      leftNote.dispatchEvent(new Event(JSDOM_ANIMATION_EVENT_TYPES.end, { bubbles: true }));
    });
    expect(onAnimationStart).toHaveBeenCalledTimes(1);
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
  });
});
