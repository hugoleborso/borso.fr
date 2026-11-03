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

  it('moves between tabs with the arrow keys and opens one only on Enter', () => {
    const onChange = vi.fn();
    render(<SectionTabs label="Views" tabs={TABS} value="one" onChange={onChange} />);
    const first = screen.getByRole('tab', { name: 'One' });
    act(() => {
      first.focus();
    });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Two' }));
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Two' }), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledExactlyOnceWith('two');
  });

  it('marks the current tab as selected', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'One' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Two' }).getAttribute('aria-selected')).toBe('false');
  });
});
