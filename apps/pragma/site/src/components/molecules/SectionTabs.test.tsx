import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SectionTabs } from './SectionTabs';

const TABS = [
  { value: 'one', label: 'One', icon: 'user' },
  { value: 'two', label: 'Two', icon: 'calendar' },
] as const;

function measureRow(row: HTMLElement, box: Readonly<Record<string, number>>): void {
  for (const [property, value] of Object.entries(box)) {
    Object.defineProperty(row, property, { configurable: true, value });
  }
}

function renderTabs(): HTMLElement {
  render(<SectionTabs label="Views" tabs={TABS} value="one" onChange={vi.fn()} />);
  return screen.getByRole('tablist', { name: 'Views' });
}

function readCues(container: HTMLElement): string[] {
  const parent = container.parentElement ?? container;
  return [...parent.querySelectorAll('[data-tab-overflow-cue]')].map((cue) =>
    String(cue.getAttribute('data-tab-overflow-cue')),
  );
}

// @FollowsBlueprint test-component-render
describe('SectionTabs', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows no cue when every tab fits', () => {
    const row = renderTabs();
    expect(readCues(row)).toEqual([]);
  });

  it('shows a cue on each edge that hides tabs, and follows the row as it scrolls', () => {
    const row = renderTabs();
    measureRow(row, { clientWidth: 100, scrollWidth: 300, scrollLeft: 0 });
    act(() => {
      fireEvent.scroll(row);
    });
    expect(readCues(row)).toEqual(['end']);

    measureRow(row, { scrollLeft: 200 });
    act(() => {
      fireEvent.scroll(row);
    });
    expect(readCues(row)).toEqual(['start']);
  });

  it('selects a tab by its press', () => {
    const onChange = vi.fn();
    render(<SectionTabs label="Views" tabs={TABS} value="one" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Two' }));
    expect(onChange).toHaveBeenCalledWith('two');
  });
});
