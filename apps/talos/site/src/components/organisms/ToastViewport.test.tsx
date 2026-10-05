import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { createIsolatedQueryClient, mountWithClient } from '../../lib/queries/queries.test-utils';
import { dismissToast, showToast } from '../../lib/toast.hook';
import { ToastViewport } from './ToastViewport';

describe('the toast viewport', () => {
  afterEach(() => {
    act(() => {
      dismissToast();
    });
    vi.useRealTimers();
  });

  it('shows a confirmation and lets it go after four seconds', () => {
    vi.useFakeTimers();
    const tree = mountWithClient(createIsolatedQueryClient(), <ToastViewport />);
    act(() => {
      showToast({ tone: 'success', message: 'Tâche ajoutée.' });
    });
    expect(tree.container.querySelector('[role="status"]')?.textContent).toBe('Tâche ajoutée.');
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(tree.container.querySelector('[role="status"]')).toBeNull();
    tree.unmount();
  });

  it('keeps a failure as an alert until the owner closes it', () => {
    vi.useFakeTimers();
    const tree = mountWithClient(createIsolatedQueryClient(), <ToastViewport />);
    act(() => {
      showToast({ tone: 'danger', message: 'Le message est parti ? Non.' });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(tree.container.querySelector('[role="alert"]')?.textContent).toContain('Non.');
    act(() => {
      tree.container.querySelector<HTMLButtonElement>('[aria-label="Fermer"]')?.click();
    });
    expect(tree.container.querySelector('[role="alert"]')).toBeNull();
    tree.unmount();
  });

  it('replaces the previous toast with the next one', () => {
    const tree = mountWithClient(createIsolatedQueryClient(), <ToastViewport />);
    act(() => {
      showToast({ tone: 'neutral', message: 'Tâche cochée.' });
    });
    act(() => {
      showToast({ tone: 'success', message: 'Proposition acceptée.' });
    });
    const shown = tree.container.querySelectorAll('[role="status"], [role="alert"]');
    expect([...shown].map((toast) => toast.textContent)).toEqual(['Proposition acceptée.']);
    tree.unmount();
  });
});
