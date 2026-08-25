import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type SceneScrollModule = typeof import('./scene-scroll.adapter');

const ONE_SECOND_MS = 1000;
const SLOW_SPEED_PX_PER_SECOND = 10;
const READABLE_SPEED_PX_PER_SECOND = 60;
const HALF_TICK_MS = 25;
const ONE_TICK_MS = 50;

async function freshModule(): Promise<SceneScrollModule> {
  vi.resetModules();
  return await import('./scene-scroll.adapter');
}

function scrollableElement(): HTMLElement {
  const element = document.createElement('div');
  document.body.append(element);
  return element;
}

describe('scene auto-scroll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('advances the attached body by the requested speed over a second', async () => {
    const { attachSceneScrollBody, startSceneAutoScroll } = await freshModule();
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(READABLE_SPEED_PX_PER_SECOND);
  });

  it('carries the fraction of a pixel a slow tick does not fill', async () => {
    const { attachSceneScrollBody, startSceneAutoScroll } = await freshModule();
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(SLOW_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_TICK_MS);
    expect(body.scrollTop).toBe(0);
    vi.advanceTimersByTime(ONE_TICK_MS);
    expect(body.scrollTop).toBe(1);
  });

  it('stops when the body detaches, which is what unmounting the scene does', async () => {
    const { attachSceneScrollBody, startSceneAutoScroll } = await freshModule();
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    attachSceneScrollBody(null);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(READABLE_SPEED_PX_PER_SECOND);
  });

  it('replaces the running timer rather than adding a second one', async () => {
    const { attachSceneScrollBody, startSceneAutoScroll } = await freshModule();
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(SLOW_SPEED_PX_PER_SECOND);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(READABLE_SPEED_PX_PER_SECOND);
  });

  it('ticks harmlessly while no body is attached', async () => {
    const { startSceneAutoScroll } = await freshModule();
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    expect(() => vi.advanceTimersByTime(ONE_SECOND_MS)).not.toThrow();
  });

  it('stops on request', async () => {
    const { attachSceneScrollBody, startSceneAutoScroll, stopSceneAutoScroll } =
      await freshModule();
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    stopSceneAutoScroll();
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(0);
  });

  it('forgets the carried fraction when it stops', async () => {
    const { attachSceneScrollBody, startSceneAutoScroll, stopSceneAutoScroll } =
      await freshModule();
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(SLOW_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(HALF_TICK_MS + ONE_TICK_MS);
    stopSceneAutoScroll();
    startSceneAutoScroll(SLOW_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_TICK_MS);
    expect(body.scrollTop).toBe(0);
  });
});

describe('scrollSceneBodyToTop', () => {
  it('sends the attached body back to the first line', async () => {
    const { attachSceneScrollBody, scrollSceneBodyToTop } = await freshModule();
    const body = scrollableElement();
    body.scrollTop = 240;
    attachSceneScrollBody(body);
    scrollSceneBodyToTop();
    expect(body.scrollTop).toBe(0);
  });

  it('does nothing with no body attached', async () => {
    const { attachSceneScrollBody, scrollSceneBodyToTop } = await freshModule();
    attachSceneScrollBody(null);
    expect(() => scrollSceneBodyToTop()).not.toThrow();
  });
});

describe('scrollCurrentPillIntoView', () => {
  it('centres the pill React just attached', async () => {
    const { scrollCurrentPillIntoView } = await freshModule();
    const pill = scrollableElement();
    const scrollIntoView = vi.fn();
    pill.scrollIntoView = scrollIntoView;
    scrollCurrentPillIntoView(pill);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  });

  it('does nothing on the detach call React makes with null', async () => {
    const { scrollCurrentPillIntoView } = await freshModule();
    expect(() => scrollCurrentPillIntoView(null)).not.toThrow();
  });
});
