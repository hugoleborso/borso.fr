import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { openApplication, stubDecksFetch } from './trainer-page.test-utils';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

// @FollowsBlueprint test-component-render
describe('the opening trainer when the deck file does not parse', () => {
  beforeAll(async () => {
    window.localStorage.clear();
    stubDecksFetch({ version: 1, decks: [{ id: 'vienna-game' }] });
    vi.stubGlobal('indexedDB', new IDBFactory());
    await openApplication();
  });

  it('shows the failure, reports the deck and keeps Explore', async () => {
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load the decks");
    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'DeckContentInvalidError' }),
      { tags: { deckId: 'vienna-game' } },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Opening decks' }));
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load the decks");
    await userEvent.click(screen.getByRole('button', { name: 'Explore' }));
    expect(await screen.findByRole('region', { name: 'Explore' })).toBeTruthy();
  });
});
