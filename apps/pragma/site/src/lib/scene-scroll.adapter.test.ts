import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  attachSceneScrollBody,
  scrollCurrentPillIntoView,
  scrollSceneBodyToTop,
  startSceneAutoScroll,
  stopSceneAutoScroll,
} from './scene-scroll.adapter';

const ONE_SECOND_MS = 1000;
const SLOW_SPEED_PX_PER_SECOND = 10;
const READABLE_SPEED_PX_PER_SECOND = 60;
const HALF_TICK_MS = 25;
const ONE_TICK_MS = 50;

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
    attachSceneScrollBody(null);
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('advances the attached body by the requested speed over a second', () => {
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(READABLE_SPEED_PX_PER_SECOND);
  });

  it('carries the fraction of a pixel a slow tick does not fill', () => {
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(SLOW_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_TICK_MS);
    expect(body.scrollTop).toBe(0);
    vi.advanceTimersByTime(ONE_TICK_MS);
    expect(body.scrollTop).toBe(1);
  });

  it('stops when the body detaches, which is what unmounting the scene does', () => {
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    attachSceneScrollBody(null);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(READABLE_SPEED_PX_PER_SECOND);
  });

  it('keeps scrolling when a second body attaches, which a re-render can do', () => {
    const first = scrollableElement();
    const second = scrollableElement();
    attachSceneScrollBody(first);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    attachSceneScrollBody(second);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(second.scrollTop).toBe(READABLE_SPEED_PX_PER_SECOND);
    expect(first.scrollTop).toBe(0);
  });

  it('replaces the running timer rather than adding a second one', () => {
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(SLOW_SPEED_PX_PER_SECOND);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(READABLE_SPEED_PX_PER_SECOND);
  });

  it('ticks harmlessly while no body is attached', () => {
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    expect(() => vi.advanceTimersByTime(ONE_SECOND_MS)).not.toThrow();
  });

  it('stops on request', () => {
    const body = scrollableElement();
    attachSceneScrollBody(body);
    startSceneAutoScroll(READABLE_SPEED_PX_PER_SECOND);
    stopSceneAutoScroll();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(ONE_SECOND_MS);
    expect(body.scrollTop).toBe(0);
  });

  it('forgets the carried fraction when it stops', () => {
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
  it('sends the attached body back to the first line', () => {
    const body = scrollableElement();
    body.scrollTop = 240;
    attachSceneScrollBody(body);
    scrollSceneBodyToTop();
    expect(body.scrollTop).toBe(0);
  });

  it('does nothing with no body attached', () => {
    attachSceneScrollBody(null);
    expect(() => scrollSceneBodyToTop()).not.toThrow();
  });
});

describe('scrollCurrentPillIntoView', () => {
  it('centres the pill React just attached', () => {
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

  it('does nothing on the detach call React makes with null', () => {
    expect(() => scrollCurrentPillIntoView(null)).not.toThrow();
  });
});
