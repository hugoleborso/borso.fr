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
      keyOverride: null,
    },
    {
      id: 'entry-3',
      setlistId: 'set-1',
      songId: 'song-3',
      position: 2,
      energy: null,
      keyOverride: null,
    },
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
    charts: [
      chordProChart(`{title: ${title}}\n[Cm]Take five\n{sot}\ne|--0--|\n{eot}`, []),
      ...extraCharts,
    ],
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
  };
}

const SONGS = [
  song('song-1', 'Take Five'),
  song('song-2', 'Helpless', [chordProChart('{title: Bass part}\n[Cm]Walking bass', ['bass'])]),
  song('song-3', 'So What'),
  song('song-4', 'Blue in Green', [chordProChart('{title: Upright}\n[Cm]Upright bass', ['bass'])]),
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
        { id: 'guitar', name: 'Guitare', icon: 'guitar', family: 'harmonic' },
        { id: 'bass', name: 'Basse', icon: 'bass', family: 'harmonic' },
      ],
    },
  }),
}));

const memberReads = vi.hoisted(() => ({ isLoaded: true }));

vi.mock('../../lib/queries/members.queries', () => ({
  useMembersList: () => ({
    data: memberReads.isLoaded
      ? { members: [{ id: 'tom', firstName: 'Tom', color: '#3a9b9b' }] }
      : undefined,
  }),
}));

vi.mock('../../lib/queries/transitions.queries', () => ({
  useTransitionComment: (songAId: string, songBId: string) => ({
    data:
      songAId === 'song-1' && songBId === 'song-2'
        ? { comment: { songAId, songBId, comment: 'Tom swaps to the bass while the drums vamp' } }
        : null,
  }),
}));

const cardObservers = vi.hoisted(() => {
  const callbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
  return callbacks;
});

vi.stubGlobal(
  'IntersectionObserver',
  class {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
      cardObservers.push(callback);
    }
    observe(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
  },
);

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

function touchAt(type: string, clientX: number, clientY: number): Event {
  const event = new Event(type, { bubbles: true });
  const touches = type === 'touchend' ? [] : [{ clientX, clientY }];
  Object.defineProperty(event, 'touches', { value: touches });
  Object.defineProperty(event, 'changedTouches', { value: [{ clientX, clientY }] });
  return event;
}

function swipeChart(
  container: HTMLElement,
  fromX: number,
  toX: number,
  startTarget?: Element,
): void {
  const body = container.querySelector('dialog > div.overflow-y-auto');
  if (body === null) throw new TypeError('no scene body');
  act(() => {
    (startTarget ?? body).dispatchEvent(touchAt('touchstart', fromX, 300));
    body.dispatchEvent(touchAt('touchend', toX, 310));
  });
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (button === null) throw new TypeError(`no button ${label}`);
  return button;
}

function readTranspose(container: HTMLElement): string {
  return getButton(container, 'Transpose down').nextElementSibling?.textContent ?? '';
}

function clickButton(button: HTMLButtonElement): void {
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('SetlistScenePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderScene(): void {
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
  }

  beforeEach(() => {
    stubDialogModalMissingFromJsdom();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    renderScene();
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
      ['Chords', 'false'],
      ['Basse', 'true'],
    ]);
  });

  it('opens the next entry on its own opening chart after a pill was tapped', () => {
    pressKey(container, 'ArrowRight');
    tapChartPill(container, 'Chords');
    expect(container.textContent).not.toContain('Walking bass');
    pressKey(container, 'ArrowRight');
    pressKey(container, 'ArrowLeft');
    expect(container.textContent).toContain('Walking bass');
  });

  it('opens the song a reorder moves under the scene on its own opening chart', () => {
    pressKey(container, 'ArrowRight');
    tapChartPill(container, 'Chords');
    const [first, second, third] = scene.initialEntries;
    if (first === undefined || second === undefined || third === undefined) {
      throw new TypeError('the scene fixture holds three entries');
    }
    const moved = { ...second, id: 'entry-4', songId: 'song-4' };
    scene.entries = [first, moved, { ...second, position: 2 }, { ...third, position: 3 }];
    renderScene();
    expect(readTitle(container)).toBe('Blue in Green');
    expect(container.textContent).toContain('Upright bass');
  });

  it('resets the transpose when the scene moves to another song', () => {
    clickButton(getButton(container, 'Transpose up'));
    expect(readTranspose(container)).toBe('+1');
    pressKey(container, 'ArrowRight');
    expect(readTranspose(container)).toBe('+0');
  });

  it('walks to the next song on a swipe to the left, and back on a swipe to the right', () => {
    swipeChart(container, 300, 100);
    expect(readTitle(container)).toBe('Helpless');
    swipeChart(container, 100, 300);
    expect(readTitle(container)).toBe('Take Five');
  });

  it('stays on the song when the swipe is too short', () => {
    swipeChart(container, 300, 260);
    expect(readTitle(container)).toBe('Take Five');
  });

  it('stays on the song when the swipe starts in a block that scrolls sideways', () => {
    const tab = container.querySelector('[data-scrolls-sideways]');
    if (tab === null) throw new TypeError('the first song carries no tab block');
    swipeChart(container, 300, 100, tab);
    expect(readTitle(container)).toBe('Take Five');
  });

  it('forgets a swipe the browser cancelled', () => {
    const body = container.querySelector('dialog > div.overflow-y-auto');
    act(() => {
      body?.dispatchEvent(touchAt('touchstart', 300, 300));
      body?.dispatchEvent(touchAt('touchcancel', 300, 300));
      body?.dispatchEvent(touchAt('touchend', 100, 300));
    });
    expect(readTitle(container)).toBe('Take Five');
  });

  it('shows the next song, its lineup as icons and the start of the note in a strip', () => {
    const strip = container.querySelector('button[aria-label="Show the transition to Helpless"]');
    expect(strip?.textContent).toContain('Helpless');
    expect(strip?.textContent).toContain('Tom swaps to the bass');
    expect(
      strip?.querySelector('[data-transition-move] [role=img]')?.getAttribute('aria-label'),
    ).toBe('Tom: Guitare → Basse');
    expect(strip?.textContent).toContain('Ebm');
    expect(strip?.querySelector('[data-transition-move]')?.textContent).not.toContain('Guitare');
    expect(strip?.querySelector('[data-transition-move]')?.textContent).not.toContain('Basse');
    expect(strip?.querySelector('[data-transition-risky]')).not.toBeNull();
  });

  it('opens the same transition as a card below the chart and hides the strip once it is in view', () => {
    const card = container.querySelector('section[aria-label="Transition to Helpless"]');
    expect(card?.textContent).toContain('Tom swaps to the bass while the drums vamp');
    act(() => {
      for (const callback of cardObservers) callback([{ isIntersecting: true }]);
    });
    expect(
      container.querySelector('button[aria-label="Show the transition to Helpless"]'),
    ).toBeNull();
    act(() => {
      for (const callback of cardObservers) callback([{ isIntersecting: false }]);
    });
    expect(
      container.querySelector('button[aria-label="Show the transition to Helpless"]'),
    ).not.toBeNull();
  });

  it('scrolls to the card when the strip is tapped', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const strip = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Show the transition to Helpless"]',
    );
    act(() => strip?.click());
    expect(scrolled.mock.contexts.at(-1)).toBe(
      container.querySelector('section[aria-label="Transition to Helpless"]'),
    );
    scrolled.mockRestore();
  });

  it('names the next song before the members have loaded, with no lineup yet', () => {
    memberReads.isLoaded = false;
    renderScene();
    const strip = container.querySelector('button[aria-label="Show the transition to Helpless"]');
    expect(strip?.querySelector('[data-transition-move]')).toBeNull();
    memberReads.isLoaded = true;
  });

  it('shows no note when the band wrote none for the pair', () => {
    pressKey(container, 'ArrowRight');
    const strip = container.querySelector('button[aria-label="Show the transition to So What"]');
    expect(strip?.textContent).not.toContain('Tom swaps');
  });

  it('shows no transition on the last song', () => {
    pressKey(container, 'ArrowRight');
    pressKey(container, 'ArrowRight');
    expect(container.querySelector('[aria-label^="Show the transition"]')).toBeNull();
    expect(container.querySelector('[aria-label^="Transition to"]')).toBeNull();
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
