import { describe, expect, it } from 'vitest';
import {
  isHidingTabsAtEnd,
  isHidingTabsAtStart,
  readTabRowOverflow,
  selectScrollLeftRevealing,
  TAB_ROW_OVERFLOWS,
} from './tab-row-overflow.utils';

// @FollowsBlueprint test-pure-unit
describe('readTabRowOverflow', () => {
  it('reads a row whose tabs fit as hiding nothing', () => {
    expect(readTabRowOverflow({ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 })).toBe('none');
  });

  it('reads a row scrolled to its start with more tabs after it as hiding the end', () => {
    expect(readTabRowOverflow({ scrollLeft: 0, clientWidth: 300, scrollWidth: 500 })).toBe('end');
  });

  it('reads a row scrolled to its end as hiding the start', () => {
    expect(readTabRowOverflow({ scrollLeft: 200, clientWidth: 300, scrollWidth: 500 })).toBe(
      'start',
    );
  });

  it('reads a row scrolled to its middle as hiding both edges', () => {
    expect(readTabRowOverflow({ scrollLeft: 100, clientWidth: 300, scrollWidth: 500 })).toBe(
      'both',
    );
  });

  it('allows one pixel of rounding at either edge and no more', () => {
    expect(readTabRowOverflow({ scrollLeft: 1, clientWidth: 300, scrollWidth: 302 })).toBe('none');
    expect(readTabRowOverflow({ scrollLeft: 2, clientWidth: 300, scrollWidth: 304 })).toBe('both');
  });
});

describe('isHidingTabsAtStart and isHidingTabsAtEnd', () => {
  it('name the edges each overflow hides', () => {
    expect(TAB_ROW_OVERFLOWS.map(isHidingTabsAtStart)).toEqual([false, true, false, true]);
    expect(TAB_ROW_OVERFLOWS.map(isHidingTabsAtEnd)).toEqual([false, false, true, true]);
  });
});

describe('selectScrollLeftRevealing', () => {
  const row = { scrollLeft: 100, clientWidth: 300, scrollWidth: 800 };

  it('leaves the row where it is when the tab and its margin are in view', () => {
    expect(selectScrollLeftRevealing({ offsetLeft: 200, offsetWidth: 80 }, row, 20)).toBe(100);
  });

  it('scrolls back so a tab cut at the start clears the cue', () => {
    expect(selectScrollLeftRevealing({ offsetLeft: 110, offsetWidth: 80 }, row, 20)).toBe(90);
  });

  it('never scrolls before the start of the row', () => {
    expect(selectScrollLeftRevealing({ offsetLeft: 10, offsetWidth: 80 }, row, 20)).toBe(0);
  });

  it('scrolls on so a tab cut at the end clears the cue', () => {
    expect(selectScrollLeftRevealing({ offsetLeft: 350, offsetWidth: 80 }, row, 20)).toBe(150);
  });

  it('treats a tab ending exactly at the cue as in view', () => {
    expect(selectScrollLeftRevealing({ offsetLeft: 300, offsetWidth: 80 }, row, 20)).toBe(100);
    expect(selectScrollLeftRevealing({ offsetLeft: 120, offsetWidth: 80 }, row, 20)).toBe(100);
  });
});
