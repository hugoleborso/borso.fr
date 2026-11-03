import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItem } from './Menu';

function renderMenu(onSelect: () => void = vi.fn()): ReturnType<typeof userEvent.setup> {
  const renameAndDelete: readonly MenuItem[] = [
    { label: 'Rename', icon: 'edit', tone: 'default', onSelect },
    { label: 'Delete', icon: 'trash', tone: 'danger', onSelect: vi.fn() },
  ];
  render(<Menu label="Actions" items={renameAndDelete} />);
  return userEvent.setup();
}

function getShadow(): HTMLElement {
  const underlay = document.querySelector<HTMLElement>('[data-testid="underlay"]');
  if (underlay === null) throw new Error('The open menu covers no page');
  return underlay;
}

// @FollowsBlueprint test-component-render
describe('Menu', () => {
  afterEach(cleanup);

  it('names its button for a screen reader and for a hover tooltip', () => {
    renderMenu();
    const button = screen.getByRole('button', { name: 'Actions' });
    expect(button.getAttribute('title')).toBe('Actions');
    expect(button.getAttribute('aria-haspopup')).toBe('true');
  });

  it('opens its items over a shadow that dims the page', async () => {
    const user = renderMenu();
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Rename',
      'Delete',
    ]);
    expect(screen.getByRole('dialog', { name: 'Actions' }).className).toContain('before:bg-scrim');
  });

  it('closes when the shadow around it is tapped, and runs no item', async () => {
    const onSelect = vi.fn();
    const user = renderMenu(onSelect);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(getShadow());
    expect(screen.queryByRole('menu')).toBe(null);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes on Escape and gives focus back to its button', async () => {
    const user = renderMenu();
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBe(null);
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Actions' }));
    });
  });

  it('closes when an item is chosen, then runs it', async () => {
    const onSelect = vi.fn();
    const user = renderMenu(onSelect);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(screen.queryByRole('menu')).toBe(null);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('colours a destructive item as a danger', async () => {
    const user = renderMenu();
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menuitem', { name: 'Delete' }).className).toContain('text-danger');
    expect(screen.getByRole('menuitem', { name: 'Rename' }).className).toContain('text-ink');
  });
});
