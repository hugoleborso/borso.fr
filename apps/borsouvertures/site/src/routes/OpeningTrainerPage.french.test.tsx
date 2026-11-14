import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDocument } from '@/decks/deck.test-utils';
import { openApplication, stubBoardGeometry, stubDecksFetch } from './trainer-page.test-utils';

vi.hoisted(() => {
  window.localStorage.setItem('borsouvertures.language', 'fr');
});

// @FollowsBlueprint test-component-render
describe('the opening trainer in French', () => {
  beforeAll(async () => {
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', new IDBFactory());
    stubBoardGeometry();
    await openApplication();
  });

  it('shows the interface, the deck name and the ideas in French', async () => {
    expect(screen.getByRole('navigation', { name: 'Sections principales' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Montrer le coup' }));
    expect(screen.getByText('French idea 1.')).toBeTruthy();
    expect(screen.getByText('Manqué. Le coup du livre est 1... d5.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Contre-gambit Albin · 1/6' })).toBeTruthy();
  });
});
