import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollPageToTop } from './page-scroll.adapter';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scrollPageToTop', () => {
  it('brings the page back to its top left corner', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    scrollPageToTop();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  });
});
