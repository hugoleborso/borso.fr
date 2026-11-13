import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18next } from '../../i18n/i18n.setup';

vi.mock('../../lib/queries/setlists.queries', () => ({
  useSetlistsList: () => ({ data: { setlists: [] }, isLoading: false, error: null }),
}));

vi.mock('../../lib/queries/sessions.queries', () => ({
  useSessionsList: () => ({ data: { sessions: [] }, isLoading: false, error: null }),
}));

const { SetlistsPage } = await import('./SetlistsPage');

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @FollowsBlueprint test-component-render
describe('SetlistsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18next.changeLanguage('fr');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/setlists']}>
          <SetlistsPage />
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('is titled Setlists, the name of the tab that opens it', () => {
    expect(container.querySelector('h1')?.textContent).toBe('Setlists');
  });

  it('shows no Sessions or Setlists toggle, since the tab bar does that job', () => {
    expect(container.querySelector('[role=tablist]')).toBeNull();
  });
});
