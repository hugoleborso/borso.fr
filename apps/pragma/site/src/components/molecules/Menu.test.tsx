import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItem } from './Menu';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ITEMS: readonly MenuItem[] = [
  { label: 'Rename', icon: 'edit', tone: 'default', onSelect: vi.fn() },
];

// @FollowsBlueprint test-component-render
describe('Menu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<Menu label="Actions" items={ITEMS} />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function openMenu(): HTMLDetailsElement {
    const details = container.querySelector('details');
    if (details === null) throw new Error('Menu renders no details element');
    act(() => container.querySelector('summary')?.click());
    expect(details.open).toBe(true);
    return details;
  }

  it('closes when the user taps outside the menu', () => {
    const details = openMenu();
    const backdrop = container.querySelector<HTMLElement>('[data-menu-backdrop]');
    expect(backdrop).not.toBeNull();
    act(() => backdrop?.click());
    expect(details.open).toBe(false);
  });

  it('closes on Escape and gives focus back to its button', () => {
    const details = openMenu();
    act(() => {
      container
        .querySelector('li button')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('summary'));
  });

  it('closes after an item is chosen', () => {
    const details = openMenu();
    act(() => container.querySelector<HTMLButtonElement>('li button')?.click());
    expect(details.open).toBe(false);
    expect(ITEMS[0]?.onSelect).toHaveBeenCalledOnce();
  });
});
