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

// @FollowsBlueprint test-jsdom-gap-stub
function stubModalDialogMissingFromJsdom(): void {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function showModalStub(this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function closeStub(this: HTMLDialogElement): void {
      this.removeAttribute('open');
    },
  });
}

// @FollowsBlueprint test-component-render
describe('Menu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    stubModalDialogMissingFromJsdom();
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

  function openMenu(): HTMLDialogElement {
    const menu = container.querySelector('dialog');
    if (menu === null) throw new Error('Menu renders no dialog');
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Actions"]')?.click());
    expect(menu.open).toBe(true);
    return menu;
  }

  it('opens as a modal dialog, so the page under its shadow cannot be tapped', () => {
    expect(container.querySelector('dialog')?.className).toContain('backdrop:bg-scrim');
    openMenu();
  });

  it('closes when the shadow around it is tapped', () => {
    const menu = openMenu();
    act(() => {
      menu.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(menu.open).toBe(false);
  });

  it('stays open when a tap lands inside the list', () => {
    const menu = openMenu();
    act(() => {
      menu.querySelector('ul')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(menu.open).toBe(true);
  });

  it('closes when an item is chosen, then runs it', () => {
    const menu = openMenu();
    act(() => menu.querySelector<HTMLButtonElement>('li button')?.click());
    expect(menu.open).toBe(false);
    expect(ITEMS[0]?.onSelect).toHaveBeenCalledOnce();
  });
});
