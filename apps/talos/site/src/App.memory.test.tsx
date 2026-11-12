import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './i18n/i18n.setup';
import { App } from './App';
import {
  createIsolatedQueryClient,
  flushTasks,
  flushUntil,
  jsonResponse,
  type MountedTree,
  mountWithClient,
  stubFetch,
} from './lib/queries/queries.test-utils';

const GARDEN = 'second-brain/domaines/jardin';
const GREENHOUSE = 'second-brain/projets/serre';
const FRESHNESS_PATH = '/api/freshness';
const ALERT_TILE_CLASS = 'bg-danger-soft';
const ALERT_TEXT_CLASS = 'text-danger';

const LATE_PAGE = {
  slug: 'second-brain/personnes/alice-martin',
  title: 'Alice Martin',
  kind: 'personne',
  closeness: 4,
  summarizedOn: '2026-10-16',
  factCount: 3,
  containedFactCount: 0,
  lateness: 12,
};

const FRESHNESS = {
  generatedAt: '2026-11-11T20:10:00+01:00',
  lateCount: 7,
  pages: [
    LATE_PAGE,
    {
      ...LATE_PAGE,
      slug: GREENHOUSE,
      title: 'Serre',
      kind: 'projet',
      summarizedOn: '2026-09-12',
      lateness: 48,
    },
    {
      ...LATE_PAGE,
      slug: 'second-brain/projets/potager',
      title: 'Potager',
      kind: 'projet',
      closeness: null,
      summarizedOn: '2026-10-01',
      lateness: 30,
    },
    {
      ...LATE_PAGE,
      slug: 'second-brain/domaines/cuisine',
      title: 'Cuisine',
      kind: 'domaine',
      closeness: 2,
      summarizedOn: '2026-10-05',
      lateness: 20,
    },
  ],
};

function page(path: string, title: string, markdown: string, summarizedOn: string | null) {
  return {
    path,
    title,
    type: 'page',
    frontMatter: {},
    markdown,
    outgoingLinks: [],
    incomingLinks: [],
    summarizedOn,
  };
}

const ROUTES: Record<string, unknown> = {
  '/api/session': { signedIn: true, registered: true },
  '/api/today': {
    date: '2026-11-11',
    focus: { updatedOn: null, items: [] },
    brief: null,
    todos: [],
    commitments: [],
    commitmentCounts: { owed: 0, awaited: 0 },
    activity: [],
    lastRuns: null,
    pendingProposalCount: 0,
    soonBirthdays: [],
    reconnectCount: 0,
    readyDraftCount: 0,
  },
  [FRESHNESS_PATH]: FRESHNESS,
  [`/api/pages/${GARDEN}`]: page(
    GARDEN,
    'Jardin',
    `# Jardin\n\n## En bref\n\nLe jardin.\n\n## Comprend\n\n- [[${GREENHOUSE}]] | statut: en-pause\n`,
    '2026-10-20',
  ),
  [`/api/pages/${GREENHOUSE}`]: page(
    GREENHOUSE,
    'Serre',
    '# Serre\n\nVitres à poser.\n',
    '2026-09-12',
  ),
  '/api/pages/journal/2026-10-05': page('journal/2026-10-05', '2026-10-05', '# 2026-10-05\n', null),
};

function answer(routes: Record<string, unknown>): (request: Request) => Promise<Response> {
  return (request) => {
    const body = routes[decodeURI(new URL(request.url).pathname)];
    return Promise.resolve(
      body === undefined ? jsonResponse({ error: 'non' }, 500) : jsonResponse(body),
    );
  };
}

function getMemoryTile(tree: MountedTree): HTMLAnchorElement {
  const tile = tree.container.querySelector<HTMLAnchorElement>(
    'nav[aria-label="Raccourcis"] a[href="/brain"]',
  );
  if (tile === null) throw new Error('no memory tile');
  return tile;
}

function getSummaryLine(tree: MountedTree): HTMLParagraphElement {
  const line = [...tree.container.querySelectorAll('p')].find((paragraph) =>
    paragraph.textContent.startsWith('Résumé du'),
  );
  if (line === undefined) throw new Error('no summary line');
  return line;
}

function isIndexShown(tree: MountedTree): boolean {
  return tree.container.querySelector('nav[aria-label="Raccourcis"]') !== null;
}

describe('the memory, its late pages made visible', () => {
  let restoreFetch: (() => void) | null = null;

  async function openApp(
    address: string,
    isShown: (tree: MountedTree) => boolean,
    handler = answer(ROUTES),
  ): Promise<MountedTree> {
    window.history.replaceState(null, '', address);
    const fetchStub = stubFetch(handler);
    restoreFetch = fetchStub.restore;
    const tree = mountWithClient(createIsolatedQueryClient(), <App />);
    await flushUntil(() => isShown(tree));
    await flushTasks();
    return tree;
  }

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  afterEach(() => {
    restoreFetch?.();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('counts the late pages on a tenth tile after the history, calm, and the tile opens the memory tab', async () => {
    const tree = await openApp('/', (shown) => shown.container.textContent.includes('7Mémoire'));
    const tiles = [...tree.container.querySelectorAll('nav[aria-label="Raccourcis"] a')];
    expect(tiles).toHaveLength(10);
    expect(tiles.map((tile) => tile.textContent).slice(8)).toStrictEqual([
      'Historique',
      '7Mémoire',
    ]);
    const tile = getMemoryTile(tree);
    expect(tile.className).not.toContain(ALERT_TILE_CLASS);
    fireEvent.click(tile);
    await flushUntil(() => tree.container.querySelector('h1')?.textContent === 'Second brain');
    expect(window.location.pathname).toBe('/brain');
    tree.unmount();
  });

  it.each([
    ['no count', 'while the state is loading', () => new Promise<Response>(() => undefined)],
    ['no count', 'when the state failed to load', () => Promise.resolve(jsonResponse({}, 500))],
    [
      'a muted zero',
      'once loaded with nothing late',
      () => Promise.resolve(jsonResponse({ generatedAt: null, lateCount: 0, pages: [] })),
    ],
  ])('shows %s of late pages on the memory tile %s', async (count, _state, answerFreshness) => {
    const answerRoutes = answer(ROUTES);
    const tree = await openApp('/', isIndexShown, (request) =>
      new URL(request.url).pathname === FRESHNESS_PATH ? answerFreshness() : answerRoutes(request),
    );
    await flushTasks();
    const tile = getMemoryTile(tree);
    expect(tile.textContent).toBe(count === 'no count' ? 'Mémoire' : '0Mémoire');
    expect(tile.querySelector('.text-ink-faint')?.textContent).toBe(
      count === 'no count' ? undefined : '0',
    );
    expect(tile.className).not.toContain(ALERT_TILE_CLASS);
    tree.unmount();
  });

  it('lists the late pages above the search, folded until tapped, the most late first, each with the name of its level by its kind and none without a closeness, each opening its page', async () => {
    const tree = await openApp(
      '/brain',
      (shown) => shown.container.querySelector('summary') !== null,
    );
    const section = tree.container.querySelector('details');
    if (section === null) throw new Error('no late section');
    expect(section.open).toBe(false);
    expect(section.querySelector('summary')?.textContent).toBe('En retard · 7');
    const search = tree.container.querySelector('input[type="search"]');
    if (search === null) throw new Error('no search');
    expect(section.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect([...section.querySelectorAll('li')].map((row) => row.textContent)).toStrictEqual([
      'Serreprojet · Important · Résumé du sam. 12 sept.',
      'Potagerprojet · Résumé du jeu. 1 oct.',
      'Cuisinedomaine · Secondaire · Résumé du lun. 5 oct.',
      'Alice Martinpersonne · Proches · Résumé du ven. 16 oct.',
    ]);
    const first = section.querySelector('a');
    if (first === null) throw new Error('no late page');
    fireEvent.click(first);
    await flushUntil(() => tree.container.textContent.includes('Vitres à poser.'));
    expect(decodeURI(window.location.pathname)).toBe(`/brain/page/${GREENHOUSE}`);
    tree.unmount();
  });

  it.each([
    ['nothing is late', { generatedAt: null, lateCount: 0, pages: [] }],
    ['the state failed to load', undefined],
  ])('shows no late section when %s', async (_state, freshness) => {
    const tree = await openApp(
      '/brain',
      (shown) => shown.container.querySelector('input[type="search"]') !== null,
      answer({ ...ROUTES, [FRESHNESS_PATH]: freshness }),
    );
    await flushTasks();
    expect(tree.container.querySelector('details')).toBeNull();
    expect(tree.container.textContent).not.toContain('En retard');
    tree.unmount();
  });

  it('says under the title of a page when its summary was written, calmly when the page is not late', async () => {
    const tree = await openApp(`/brain/page/${GARDEN}`, (shown) =>
      shown.container.textContent.includes('Résumé du'),
    );
    const line = getSummaryLine(tree);
    expect(line.textContent).toBe('Résumé du mar. 20 oct.');
    expect(line.className).not.toContain(ALERT_TEXT_CLASS);
    expect(line.previousElementSibling?.querySelector('h1')?.textContent).toBe('Jardin');
    expect(line.nextElementSibling?.textContent).toContain('Le jardin.');
    expect(tree.container.textContent).toContain('Comprend');
    expect(tree.container.textContent).not.toContain('Projets liés');
    tree.unmount();
  });

  it('says in words and in the alert colour that the summary of a late page is late', async () => {
    const tree = await openApp(`/brain/page/${GREENHOUSE}`, (shown) =>
      shown.container.textContent.includes('en retard'),
    );
    const line = getSummaryLine(tree);
    expect(line.textContent).toBe('Résumé du sam. 12 sept., en retard');
    expect(line.className).toContain(ALERT_TEXT_CLASS);
    tree.unmount();
  });

  it('shows no summary line on what is not an entity', async () => {
    const tree = await openApp(
      '/brain/page/journal/2026-10-05',
      (shown) => shown.container.querySelector('article h1') !== null,
    );
    await flushTasks();
    expect(tree.container.textContent).not.toContain('Résumé du');
    tree.unmount();
  });
});
