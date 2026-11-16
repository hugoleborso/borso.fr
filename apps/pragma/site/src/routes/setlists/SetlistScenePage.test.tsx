import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { ApiError } from '../../lib/api.client';

interface SetlistReadStub {
  readonly data: undefined;
  readonly isLoading: boolean;
  readonly error: unknown;
}

const setlistReads = vi.hoisted(() => {
  const reads: SetlistReadStub[] = [];
  return reads;
});

const scene = vi.hoisted(() => {
  const initialEntries = [
    { id: 'entry-1', setlistId: 'set-1', songId: 'song-1', position: 0, energy: 7 },
    {
      id: 'entry-2',
      setlistId: 'set-1',
      songId: 'song-2',
      position: 1,
      energy: null,
      lineupOverride: { tom: ['bass'] },
    },
    { id: 'entry-3', setlistId: 'set-1', songId: 'song-3', position: 2, energy: null },
  ];
  return {
    setlist: { id: 'set-1', name: 'Les Disquaires' },
    entries: initialEntries,
    initialEntries,
  };
});

function chordProChart(text: string, instrumentIds: string[]) {
  return { kind: 'chordpro', text, instrumentIds, label: null };
}

function song(id: string, title: string, extraCharts: readonly unknown[] = []) {
  return {
    id,
    title,
    artist: 'Dave Brubeck',
    tonalityStart: 'Ebm',
    tonalityEnd: null,
    baseEnergy: 5,
    defaultLineup: { tom: ['guitar'] },
    charts: [chordProChart(`{title: ${title}}\n[Cm]Take five`, []), ...extraCharts],
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
  };
}

const SONGS = [
  song('song-1', 'Take Five'),
  song('song-2', 'Helpless', [chordProChart('{title: Bass part}\n[Cm]Walking bass', ['bass'])]),
  song('song-3', 'So What'),
];

vi.mock('../../lib/queries/setlists.queries', () => ({
  useSetlist: () =>
    setlistReads[0] ?? { data: { setlist: scene.setlist }, isLoading: false, error: null },
}));

vi.mock('../../lib/queries/setlist-entries.queries', () => ({
  useSetlistEntries: () => ({ data: { entries: scene.entries }, isLoading: false, error: null }),
}));

vi.mock('../../lib/queries/me.queries', () => ({
  useSignedInMember: () => ({ data: { memberId: 'tom' } }),
}));

vi.mock('../../lib/queries/instruments.queries', () => ({
  useInstrumentsList: () => ({
    data: {
      instruments: [
        { id: 'guitar', name: 'Guitare' },
        { id: 'bass', name: 'Basse' },
      ],
    },
  }),
}));

vi.mock('../../lib/queries/songs.queries', () => ({
  useSongsList: () => ({ data: { songs: SONGS }, isLoading: false, error: null }),
}));

const { SetlistScenePage } = await import('./SetlistScenePage');

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @FollowsBlueprint test-jsdom-gap-stub
function stubDialogModalMissingFromJsdom(): void {
  function stubShowModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  }
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: stubShowModal,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: function scrollIntoViewStub(): void {
      return undefined;
    },
  });
}

function readTitle(container: HTMLElement): string {
  return container.querySelector('h2')?.textContent.trim() ?? '';
}

function readPosition(container: HTMLElement): string {
  return container.querySelector('dialog p')?.textContent.trim() ?? '';
}

function pressKey(container: HTMLElement, key: string): void {
  const dialog = container.querySelector('dialog');
  if (dialog === null) throw new TypeError('the scene rendered no dialog');
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function listPills(container: HTMLElement): HTMLButtonElement[] {
  const rail = container.querySelector('nav');
  return rail === null ? [] : Array.from(rail.querySelectorAll('button'));
}

function readChartPills(container: HTMLElement): (string | null)[][] {
  return Array.from(container.querySelectorAll('[role=tab]')).map((tab) => [
    tab.textContent,
    tab.getAttribute('aria-selected'),
  ]);
}

function tapChartPill(container: HTMLElement, name: string): void {
  const pill = Array.from(container.querySelectorAll<HTMLElement>('[role=tab]')).find(
    (tab) => tab.textContent === name,
  );
  if (pill === undefined) throw new TypeError(`no chart pill ${name}`);
  act(() => {
    pill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    pill.click();
  });
}

function clickButton(button: HTMLButtonElement): void {
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('SetlistScenePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    stubDialogModalMissingFromJsdom();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/setlists/set-1/scene']}>
          <Routes>
            <Route path="/setlists/:setlistId/scene" element={<SetlistScenePage />} />
            <Route path="/setlists/:setlistId" element={<p>editor</p>} />
          </Routes>
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    scene.entries = scene.initialEntries;
  });

  it('opens on the first song of the set', () => {
    expect(readTitle(container)).toBe('Take Five');
    expect(readPosition(container)).toContain('01 / 03');
    expect(readPosition(container)).toContain('Les Disquaires');
  });

  it('keeps its header below the status bar of a phone with a notch', () => {
    expect(container.querySelector('dialog header')?.className).toContain(
      'pt-[calc(1rem+env(safe-area-inset-top))]',
    );
  });

  it('renders the chart of the song being played', () => {
    expect(container.textContent).toContain('Take five');
  });

  it('walks to the next song on the right arrow', () => {
    pressKey(container, 'ArrowRight');
    expect(readTitle(container)).toBe('Helpless');
    expect(readPosition(container)).toContain('02 / 03');
  });

  it('opens an entry whose lineup moves the member to Basse on the Basse chart', () => {
    pressKey(container, 'ArrowRight');
    expect(container.textContent).toContain('Walking bass');
    expect(readChartPills(container)).toEqual([
      ['All instruments', 'false'],
      ['Basse', 'true'],
    ]);
  });

  it('opens the next entry on its own opening chart after a pill was tapped', () => {
    pressKey(container, 'ArrowRight');
    tapChartPill(container, 'All instruments');
    expect(container.textContent).not.toContain('Walking bass');
    pressKey(container, 'ArrowRight');
    pressKey(container, 'ArrowLeft');
    expect(container.textContent).toContain('Walking bass');
  });

  it('walks back on the left arrow', () => {
    pressKey(container, 'ArrowRight');
    pressKey(container, 'ArrowLeft');
    expect(readTitle(container)).toBe('Take Five');
  });

  it('holds on the first song rather than wrapping to the last', () => {
    pressKey(container, 'ArrowLeft');
    expect(readTitle(container)).toBe('Take Five');
  });

  it('holds on the last song rather than wrapping to the first', () => {
    pressKey(container, 'ArrowRight');
    pressKey(container, 'ArrowRight');
    pressKey(container, 'ArrowRight');
    expect(readTitle(container)).toBe('So What');
  });

  it('leaves the chart to scroll on the keys it does not claim', () => {
    pressKey(container, 'ArrowDown');
    expect(readTitle(container)).toBe('Take Five');
  });

  it('jumps to the song a player taps in the rail', () => {
    const pills = listPills(container);
    const lastPill = pills.at(-1);
    if (lastPill === undefined) throw new TypeError('the rail rendered no pill');
    clickButton(lastPill);
    expect(readTitle(container)).toBe('So What');
  });

  it('marks the song being played as the current pill', () => {
    pressKey(container, 'ArrowRight');
    const current = container.querySelector('button[aria-current="true"]');
    expect(current?.getAttribute('aria-label')).toContain('Helpless');
  });

  it('turns auto-scroll on and off from the same button', () => {
    const toggle = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Auto-scroll',
    );
    if (toggle === undefined) throw new TypeError('the controls rendered no auto-scroll button');
    clickButton(toggle);
    const running = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-pressed') === 'true',
    );
    expect(running?.getAttribute('aria-label')).toBe('Stop');
  });
});

describe('SetlistScenePage with an empty set', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    stubDialogModalMissingFromJsdom();
    scene.entries = [];
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/setlists/set-1/scene']}>
          <Routes>
            <Route path="/setlists/:setlistId/scene" element={<SetlistScenePage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('says the set carries no song and offers no transport', () => {
    expect(container.textContent).toContain('No song in this set yet.');
    expect(container.querySelector('nav')).toBeNull();
  });
});

describe('SetlistScenePage with no setlist in hand', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderScene(read: SetlistReadStub): void {
    setlistReads.push(read);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/setlists/set-1/scene']}>
          <Routes>
            <Route path="/setlists/:setlistId/scene" element={<SetlistScenePage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  }

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setlistReads.length = 0;
  });

  it('says the page cannot be loaded, not that the setlist is gone, when the read is paused offline', () => {
    renderScene({ data: undefined, isLoading: false, error: null });

    expect(container.querySelector('[role=alert]')?.textContent).toBe(
      'This page could not be loaded. Check the connection, then try again.',
    );
    expect(container.textContent).not.toContain('This setlist no longer exists.');
  });

  it('says the setlist is gone when the API answered 404', () => {
    renderScene({
      data: undefined,
      isLoading: false,
      error: new ApiError(404, 'setlist 404', null),
    });

    expect(container.textContent).toContain('This setlist no longer exists.');
  });
});
