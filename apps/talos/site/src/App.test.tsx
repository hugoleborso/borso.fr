import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './i18n/i18n.setup';
import { App } from './App';
import { DISPLAY_LOCALE, formatLongDay, toIsoDay } from './lib/calendar-day.utils';
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
    expect(tree.container.querySelector('h1')?.textContent).toBe(
      formatLongDay(toIsoDay(new Date()), DISPLAY_LOCALE),
    );
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

  it('draws the dashboard and opens Claude Code on a long-pressed todo', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const routes: Record<string, unknown> = {
      '/api/session': { signedIn: true, registered: true },
      '/api/messages/claude-code': {
        repository: 'proprietaire/notes',
        environments: { talos: 'env_lecture', build: null },
      },
      '/api/today': {
        date: '2026-10-08',
        focus: { updatedOn: null, items: [{ title: 'Atelier client' }] },
        brief: { date: '2026-10-08', markdown: 'Journée calme' },
        todos: [
          { id: 'a1', text: 'Envoyer le devis', done: false, dueDate: '2026-10-06' },
          { id: 'b2', text: 'Appeler Bruno', done: false },
        ],
        commitments: [
          {
            path: 'engagements/2026-10-09-dossier',
            title: 'Rendre le dossier',
            direction: 'owed',
            dueDate: '2026-10-09',
          },
        ],
        commitmentCounts: { owed: 4, awaited: 2 },
        activity: [{ date: '2026-10-08', heading: 'Scan (07:00)' }],
        lastRuns: {
          scan: { at: '2026-10-08T05:00:00Z', failedSources: ['Strava'] },
          macCollection: null,
        },
        pendingProposalCount: 3,
        soonBirthdays: [],
        reconnectCount: 0,
        readyDraftCount: 0,
      },
    };
    restoreFetch = stubFetch((request) => {
      const body = routes[new URL(request.url).pathname];
      return Promise.resolve(
        body === undefined ? jsonResponse({ error: 'non' }, 500) : jsonResponse(body),
      );
    }).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.textContent.includes('Envoyer le devis'));
    const text = tree.container.textContent;
    for (const expected of [
      'À décider',
      'Je dois',
      'On me doit',
      'En retard',
      'Atelier client',
      'Rendre le dossier',
      'Journée calme',
      'Scan (07:00)',
      'Sans date',
      'Demain',
    ]) {
      expect(text).toContain(expected);
    }
    const scanLink = tree.container.querySelector('a[aria-label="Scanner"]');
    expect(scanLink?.getAttribute('href')).toContain('environment=env_lecture');
    expect(scanLink?.getAttribute('href')).toContain('talos-scan');
    const row = [...tree.container.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Appeler Bruno'),
    )?.parentElement;
    if (row === undefined || row === null) throw new Error('no row');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.pointerDown(row, { button: 0, clientX: 5, clientY: 5 });
    act(() => {
      vi.advanceTimersByTime(450);
    });
    const dialog = tree.container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toBe('Appeler Bruno');
    const discuss = dialog?.querySelector('a');
    const address = new URL(discuss?.getAttribute('href') ?? '');
    expect(address.searchParams.get('repo')).toBe('proprietaire/notes');
    expect(address.searchParams.get('environment')).toBe('env_lecture');
    expect(address.searchParams.get('q')).toContain(
      'Tu vas discuter de la tâche « Appeler Bruno » (todo.md).',
    );
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    if (discuss === undefined || discuss === null) throw new Error('no discuss link');
    fireEvent.click(discuss);
    expect(writeText).toHaveBeenCalledWith(address.searchParams.get('q'));
    Reflect.deleteProperty(navigator, 'clipboard');
    vi.useRealTimers();
    tree.unmount();
  });
});
