import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './i18n/i18n.setup';
import { App } from './App';
import { DISPLAY_LOCALE, formatLongDay, toIsoDay } from './lib/calendar-day.utils';
import {
  createIsolatedQueryClient,
  flushTasks,
  flushUntil,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './lib/queries/queries.test-utils';

const WATCH = {
  id: 'veille-meteo',
  title: 'Veille météo',
  cadence: 'hebdomadaire',
  routine: 'nuit',
  what: 'Relever les prévisions de la semaine.',
  lastRunOn: '2026-10-01',
  nextRunOn: '2026-10-15',
  isDue: false,
};

const RECURRING_TASKS = [
  WATCH,
  { ...WATCH, id: 'tri-photos', title: 'Tri des photos', nextRunOn: '2026-10-07', isDue: true },
  { ...WATCH, id: 'bilan-budget', title: 'Bilan du budget', nextRunOn: '2026-10-06', isDue: true },
];

const DAY_ROUTES: Record<string, unknown> = {
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
      { id: 'b2', text: 'Appeler Bruno', done: false, dueDate: '2026-10-08' },
      { id: 'c3', text: 'Ranger le garage', done: false },
    ],
    commitments: [
      {
        path: 'engagements/2026-10-09-dossier',
        title: 'Rendre le dossier',
        direction: 'owed',
        dueDate: '2026-10-08',
      },
      {
        path: 'engagements/2026-10-01-contrat',
        title: 'Retour du contrat',
        direction: 'awaited',
        counterpartName: 'Camille Durand',
        action: 'Renvoyer le contrat signé',
        dueDate: '2026-10-08',
      },
    ],
    commitmentCounts: { owed: 4, awaited: 2 },
    activity: [{ date: '2026-10-08', heading: 'Scan (07:00)' }],
    lastRuns: {
      scan: { at: '2026-10-08T05:00:00Z', failedSources: ['Strava'] },
      macCollection: null,
    },
    pendingProposalCount: 3,
    soonBirthdays: [
      {
        page: 'personnes/lucie-martin',
        title: 'Lucie Martin',
        date: '2026-10-10',
        daysUntil: 2,
        age: 40,
      },
    ],
    reconnectCount: 0,
    readyDraftCount: 0,
  },
  '/api/recurring-tasks': { generatedAt: '2026-10-08T05:00:00Z', tasks: RECURRING_TASKS },
};

const TALK_ROUTES: Record<string, unknown> = {
  ...DAY_ROUTES,
  '/api/messages/claude-code': {
    repository: 'proprietaire/notes',
    environments: { talos: 'env_lecture', build: 'env_construction' },
  },
};
const TALK_ADDRESS =
  'https://claude.ai/code/new?repo=proprietaire%2Fnotes&environment=env_construction' +
  '&q=Tu%20es%20Talos.%20Hugo%20veut%20te%20parler%20%3A';

function readTalkLink(container: HTMLElement): HTMLAnchorElement | null {
  return (
    [...container.querySelectorAll<HTMLAnchorElement>('nav a')].find(
      (link) => link.textContent === 'Parler à Talos',
    ) ?? null
  );
}

const RECURRING_TASKS_PATH = '/api/recurring-tasks';
const DAY_CONTENT_IN_ORDER = [
  'Récurrentes',
  'Notifications',
  'Lucie Martin',
  'Journée calme',
  'Envoyer le devis',
  'En attente · 1',
  'Atelier client',
  'Activité · 1',
];

function answerFrom(routes: Record<string, unknown>): (request: Request) => Promise<Response> {
  return (request) => {
    const body = routes[new URL(request.url).pathname];
    return Promise.resolve(
      body === undefined ? jsonResponse({ error: 'non' }, 500) : jsonResponse(body),
    );
  };
}

function stubStandaloneDisplay(): void {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function stubPushSupport(): void {
  vi.stubGlobal('Notification', { permission: 'default' });
  vi.stubGlobal('PushManager', function PushManager() {
    return null;
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      ready: Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(null) } }),
    },
    configurable: true,
  });
}

function getRecurringTile(container: HTMLElement): HTMLAnchorElement {
  const tile = container.querySelector<HTMLAnchorElement>('a[href="/recurring"]');
  if (tile === null) throw new Error('no recurring tile');
  return tile;
}

describe('the application shell', () => {
  let restoreFetch: (() => void) | null = null;

  afterEach(() => {
    restoreFetch?.();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'serviceWorker');
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
    const titleMark = tree.container.querySelector('h1 img[data-opening-dock]');
    expect(titleMark?.getAttribute('src')).toBe('/icons/coin-face.webp');
    expect(titleMark?.getAttribute('width')).toBe('28');
    expect(tree.container.querySelectorAll('[data-opening-dock]')).toHaveLength(1);
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
    stubStandaloneDisplay();
    restoreFetch = stubFetch(answerFrom(DAY_ROUTES)).restore;
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
      "Aujourd'hui",
      'Engagement',
      'Scan il y a',
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toContain('Ranger le garage');
    expect(text).not.toContain('Accepter');
    const awaited = tree.container.querySelector('details');
    expect(awaited?.open).toBe(false);
    expect(awaited?.querySelector('summary')?.textContent).toBe('En attente · 1');
    expect(awaited?.textContent).toContain('Camille · Renvoyer le contrat signé');
    const agendaText = [...tree.container.querySelectorAll('section[aria-label]')]
      .map((section) => section.textContent)
      .join(' ');
    expect(agendaText).toContain('Rendre le dossier');
    expect(agendaText).not.toContain('Renvoyer le contrat signé');
    const scanLink = tree.container.querySelector('a[aria-label="Scanner"]');
    expect(scanLink?.getAttribute('href')).toContain('environment=env_lecture');
    expect(scanLink?.getAttribute('href')).toContain('skill%20scanner-sources%20sur');
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
      'Tu vas discuter de la tâche « Appeler Bruno » (todo: personal).',
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

  it('opens the day on its index, the due recurring tasks raised, then the rest in a fixed order', async () => {
    stubStandaloneDisplay();
    stubPushSupport();
    restoreFetch = stubFetch(answerFrom(DAY_ROUTES)).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.textContent.includes('Notifications'));
    await flushTasks();
    const index = tree.container.querySelector('nav[aria-label="Raccourcis"]');
    const content = index?.parentElement;
    expect(content?.previousElementSibling?.textContent).toContain('Scan il y a');
    expect(content?.firstElementChild).toBe(index);
    expect(
      [...(content?.children ?? [])].map((child) =>
        DAY_CONTENT_IN_ORDER.find((marker) => child.textContent.includes(marker)),
      ),
    ).toStrictEqual(DAY_CONTENT_IN_ORDER);
    const tile = getRecurringTile(tree.container);
    expect(tile.textContent).toBe('2Récurrentes');
    expect(tile.className).toContain('bg-danger-soft');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.pointerDown(tile, { button: 0, clientX: 5, clientY: 5 });
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(tree.container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Récurrentes · 2',
    );
    tree.unmount();
  });

  it('puts « Parler à Talos » in the tab bar of every screen, opening Claude Code on the build environment', async () => {
    window.history.replaceState(null, '', '/recurring');
    restoreFetch = stubFetch(answerFrom(TALK_ROUTES)).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => readTalkLink(tree.container)?.hasAttribute('href') === true);
    const link = readTalkLink(tree.container);
    expect(link?.getAttribute('href')).toBe(TALK_ADDRESS);
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
    tree.unmount();
  });

  it('answers /talk, the address of the home-screen shortcut, with the link to talk to Talos', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.history.replaceState(null, '', '/talk');
    restoreFetch = stubFetch(answerFrom(TALK_ROUTES)).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.querySelector(`main a[href="${TALK_ADDRESS}"]`) !== null);
    expect(tree.container.querySelector('h1')?.textContent).toBe('Parler à Talos');
    tree.unmount();
    vi.restoreAllMocks();
  });

  it('lists the routine runs on a screen of their own', async () => {
    window.history.replaceState(null, '', '/runs');
    restoreFetch = stubFetch(
      answerFrom({
        ...DAY_ROUTES,
        '/api/routine/runs': {
          items: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              firedAt: '2026-10-08T05:00:00Z',
              trigger: 'proposition',
              subject: 'etat/propositions/2026-10-08-devis',
              sessionUrl: 'https://claude.ai/code/session_01Exemple',
            },
          ],
        },
      }),
    ).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.textContent.includes('2026-10-08-devis'));
    expect(tree.container.querySelector('h1')?.textContent).toBe('Lancements');
    expect(
      tree.container.querySelector('main a[href="https://claude.ai/code/session_01Exemple"]')
        ?.textContent,
    ).toBe('Ouvrir');
    tree.unmount();
  });

  it('shows the recurring tasks at their address, and the tile of the day leads there', async () => {
    stubStandaloneDisplay();
    window.history.replaceState(null, '', '/recurring');
    restoreFetch = stubFetch(answerFrom(DAY_ROUTES)).restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.querySelector('summary') !== null);
    expect(tree.container.querySelector('h1')?.textContent).toBe('Tâches récurrentes');
    expect(tree.container.textContent).toContain('3 tâches · 2 dues');
    expect(
      [...tree.container.querySelectorAll('summary')].map((summary) => summary.textContent),
    ).toStrictEqual([
      'dueBilan du budgethebdomadaire · Dernier lancement jeu. 1 oct. → Prochain lancement mar. 6 oct.',
      'dueTri des photoshebdomadaire · Dernier lancement jeu. 1 oct. → Prochain lancement mer. 7 oct.',
      'à jourVeille météohebdomadaire · Dernier lancement jeu. 1 oct. → Prochain lancement jeu. 15 oct.',
    ]);
    const back = tree.container.querySelector<HTMLAnchorElement>('a[href="/"]');
    if (back === null) throw new Error('no way back to the day');
    fireEvent.click(back);
    await flushUntil(() => tree.container.querySelector('a[href="/recurring"]') !== null);
    expect(window.location.pathname).toBe('/');
    fireEvent.click(getRecurringTile(tree.container));
    expect(window.location.pathname).toBe('/recurring');
    expect(tree.container.querySelector('h1')?.textContent).toBe('Tâches récurrentes');
    tree.unmount();
  });

  it.each([
    ['no count', 'while they are loading', () => new Promise<Response>(() => undefined)],
    ['no count', 'when they failed to load', () => Promise.resolve(jsonResponse({}, 500))],
    [
      'a muted zero',
      'once loaded with none due',
      () => Promise.resolve(jsonResponse({ generatedAt: null, tasks: [WATCH] })),
    ],
  ])('shows %s of due recurring tasks on their tile %s', async (count, _state, answer) => {
    stubStandaloneDisplay();
    const answerDay = answerFrom(DAY_ROUTES);
    const fetchStub = stubFetch((request) =>
      new URL(request.url).pathname === RECURRING_TASKS_PATH ? answer() : answerDay(request),
    );
    restoreFetch = fetchStub.restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => tree.container.querySelector('a[href="/recurring"]') !== null);
    await flushTasks();
    await flushTasks();
    const tile = getRecurringTile(tree.container);
    expect(
      fetchStub.calls.some((call) => new URL(call.url).pathname === RECURRING_TASKS_PATH),
    ).toBe(true);
    expect(tile.textContent).toBe(count === 'no count' ? 'Récurrentes' : '0Récurrentes');
    expect(tile.querySelector('.text-ink-faint')?.textContent).toBe(
      count === 'no count' ? undefined : '0',
    );
    expect(tile.className).not.toContain('bg-danger-soft');
    tree.unmount();
  });
});
