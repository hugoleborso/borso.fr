import { screen } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { openApplication } from './trainer-page.test-utils';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

// @FollowsBlueprint test-component-render
describe('the opening trainer when the deck file cannot be reached', () => {
  beforeAll(async () => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    vi.stubGlobal('indexedDB', new IDBFactory());
    await openApplication();
  });

  it('offers a reload and reports nothing, because being offline is not an error', () => {
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load the decks");
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});
