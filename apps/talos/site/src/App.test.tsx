import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './i18n/i18n.setup';
import { App } from './App';
import {
  createIsolatedQueryClient,
  flushUntil,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './lib/queries/queries.test-utils';

describe('the application shell', () => {
  let restoreFetch: (() => void) | null = null;

  afterEach(() => {
    restoreFetch?.();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('sends a visitor without a session to the bootstrap step before any passkey exists', async () => {
    vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {
      return null;
    });
    restoreFetch = stubFetch(() =>
      Promise.resolve(jsonResponse({ signedIn: false, registered: false })),
    ).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.textContent.includes('Code de démarrage'));
    expect(window.location.pathname).toBe('/login');
    expect(tree.container.textContent).toContain('Code de démarrage');
    tree.unmount();
  });

  it('opens today behind the tab bar once signed in', async () => {
    restoreFetch = stubFetch((request) =>
      Promise.resolve(
        new URL(request.url).pathname === '/api/session'
          ? jsonResponse({ signedIn: true, registered: true })
          : jsonResponse({ error: 'non' }, 500),
      ),
    ).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.querySelector('h1') !== null);
    expect(tree.container.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'Navigation principale',
    );
    expect(tree.container.querySelector('h1')?.textContent).toBe("Aujourd'hui");
    tree.unmount();
  });

  it('lists the passkeys in the settings and signs out back to the sign-in screen', async () => {
    window.history.replaceState(null, '', '/settings');
    const fetchStub = stubFetch((request) => {
      const routes: Record<string, unknown> = {
        '/api/session': { signedIn: true, registered: true },
        '/api/auth/passkeys': {
          items: [
            { id: '0b6f1c8e-7c1a-4f1e-9a3b-2d4e5f6a7b8c', createdAt: '2026-10-05T08:00:00Z' },
          ],
        },
        '/api/auth/logout': { ok: true },
      };
      const body = routes[new URL(request.url).pathname];
      return Promise.resolve(
        body === undefined ? jsonResponse({ error: 'non' }, 500) : jsonResponse(body),
      );
    });
    restoreFetch = fetchStub.restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.textContent.includes('Passkey 1'));
    expect(tree.container.querySelector('h1')?.textContent).toBe('Réglages');
    expect(tree.container.textContent).toContain('Ajoutée le 5 octobre 2026');
    expect(tree.container.textContent).toContain('La dernière passkey ne peut pas être retirée.');
    expect(tree.container.querySelector('[aria-label^="Retirer la passkey"]')).toBeNull();
    const signOut = [...tree.container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Se déconnecter',
    );
    await act(async () => {
      signOut?.click();
      await Promise.resolve();
    });
    await flushUntil(() => window.location.pathname === '/login');
    expect(window.location.pathname).toBe('/login');
    expect(
      fetchStub.calls.some(
        (call) => call.method === 'POST' && new URL(call.url).pathname === '/api/auth/logout',
      ),
    ).toBe(true);
    tree.unmount();
  });
});
