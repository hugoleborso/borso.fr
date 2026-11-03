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

  function readList(): HTMLUListElement {
    const list = container.querySelector('ul');
    if (list === null) throw new Error('Menu renders no list');
    return list;
  }

  it('is a light-dismiss popover, so the browser closes it on a tap outside and on Escape', () => {
    expect(readList().getAttribute('popover')).toBe('auto');
  });

  it('opens from its button, which the browser gives focus back to', () => {
    const button = container.querySelector('button[aria-label="Actions"]');
    expect(button?.getAttribute('popovertarget')).toBe(readList().id);
  });

  it('closes when an item is chosen, then runs it', () => {
    const renameButton = container.querySelector<HTMLButtonElement>('li button');
    expect(renameButton?.getAttribute('popovertarget')).toBe(readList().id);
    expect(renameButton?.getAttribute('popovertargetaction')).toBe('hide');
    act(() => renameButton?.click());
    expect(ITEMS[0]?.onSelect).toHaveBeenCalledOnce();
  });
});
