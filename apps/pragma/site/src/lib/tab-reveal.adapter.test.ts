import { describe, expect, it } from 'vitest';
import { revealTabInItsRow, TAB_OVERFLOW_CUE_WIDTH_PX } from './tab-reveal.adapter';

const ROW_WIDTH = 300;
const TAB_WIDTH = 80;

function measured<Element extends HTMLElement>(
  element: Element,
  box: Readonly<Record<string, number>>,
): Element {
  for (const [property, value] of Object.entries(box)) {
    Object.defineProperty(element, property, { configurable: true, value });
  }
  return element;
}

function tabInRow(offsetLeft: number): { tab: HTMLElement; row: HTMLElement } {
  const row = measured(document.createElement('div'), {
    clientWidth: ROW_WIDTH,
    scrollWidth: 900,
  });
  const tab = measured(document.createElement('button'), {
    offsetLeft,
    offsetWidth: TAB_WIDTH,
  });
  row.append(tab);
  return { tab, row };
}

describe('revealTabInItsRow', () => {
  it('scrolls the row so a tab past its end clears the overflow cue', () => {
    const { tab, row } = tabInRow(500);
    revealTabInItsRow(tab);
    expect(row.scrollLeft).toBe(500 + TAB_WIDTH + TAB_OVERFLOW_CUE_WIDTH_PX - ROW_WIDTH);
  });

  it('leaves the row at its start when the tab is already in view', () => {
    const { tab, row } = tabInRow(0);
    revealTabInItsRow(tab);
    expect(row.scrollLeft).toBe(0);
  });

  it('does nothing for a tab that has no row, or when the tab detaches', () => {
    expect(() => revealTabInItsRow(document.createElement('button'))).not.toThrow();
    expect(() => revealTabInItsRow(null)).not.toThrow();
  });
});
