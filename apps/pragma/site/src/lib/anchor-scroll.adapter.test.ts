import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollIntoViewWhenAddressed } from './anchor-scroll.adapter';

const SECTION_ID = 'calendar';

function sectionWithScrollSpy(): {
  element: HTMLElement;
  scrollIntoView: ReturnType<typeof vi.fn>;
} {
  const element = document.createElement('section');
  element.id = SECTION_ID;
  const scrollIntoView = vi.fn();
  element.scrollIntoView = scrollIntoView;
  return { element, scrollIntoView };
}

describe('scrollIntoViewWhenAddressed', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('brings the section the address names to the top of the screen', () => {
    window.history.replaceState(null, '', `/account#${SECTION_ID}`);
    const { element, scrollIntoView } = sectionWithScrollSpy();
    scrollIntoViewWhenAddressed(element);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });

  it('leaves the page where it is when the address names another section', () => {
    window.history.replaceState(null, '', '/account#passkeys');
    const { element, scrollIntoView } = sectionWithScrollSpy();
    scrollIntoViewWhenAddressed(element);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does nothing when the section detaches', () => {
    window.history.replaceState(null, '', `/account#${SECTION_ID}`);
    expect(() => scrollIntoViewWhenAddressed(null)).not.toThrow();
  });
});
