import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';

const scene = vi.hoisted(() => ({
  setlist: { id: 'set-1', name: 'Les Disquaires' },
  entries: [
    { id: 'entry-1', setlistId: 'set-1', songId: 'song-1', position: 0, energy: 7 },
    { id: 'entry-2', setlistId: 'set-1', songId: 'song-2', position: 1, energy: null },
    { id: 'entry-3', setlistId: 'set-1', songId: 'song-3', position: 2, energy: null },
  ],
}));

function song(id: string, title: string) {
  return {
    id,
    title,
    artist: 'Dave Brubeck',
    tonalityStart: 'Ebm',
    tonalityEnd: null,
    baseEnergy: 5,
    chart: { kind: 'chordpro', text: `{title: ${title}}\n[Cm]Take five` },
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
  };
}

const SONGS = [song('song-1', 'Take Five'), song('song-2', 'Helpless'), song('song-3', 'So What')];

vi.mock('../../lib/queries/setlists.queries', () => ({
  useSetlist: () => ({ data: { setlist: scene.setlist }, isLoading: false, error: null }),
}));

vi.mock('../../lib/queries/setlist-entries.queries', () => ({
  useSetlistEntries: () => ({ data: { entries: scene.entries }, isLoading: false, error: null }),
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
    scene.entries = [
      { id: 'entry-1', setlistId: 'set-1', songId: 'song-1', position: 0, energy: 7 },
      { id: 'entry-2', setlistId: 'set-1', songId: 'song-2', position: 1, energy: null },
      { id: 'entry-3', setlistId: 'set-1', songId: 'song-3', position: 2, energy: null },
    ];
  });

  it('opens on the first song of the set', () => {
    expect(readTitle(container)).toBe('Take Five');
    expect(readPosition(container)).toContain('01 / 03');
    expect(readPosition(container)).toContain('Les Disquaires');
  });

  it('renders the chart of the song being played', () => {
    expect(container.textContent).toContain('Take five');
  });

  it('walks to the next song on the right arrow', () => {
    pressKey(container, 'ArrowRight');
    expect(readTitle(container)).toBe('Helpless');
    expect(readPosition(container)).toContain('02 / 03');
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
    expect(current?.textContent).toContain('Helpless');
  });

  it('turns auto-scroll on and off from the same button', () => {
    const toggle = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Auto-scroll'),
    );
    if (toggle === undefined) throw new TypeError('the controls rendered no auto-scroll button');
    clickButton(toggle);
    const running = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-pressed') === 'true',
    );
    expect(running?.textContent).toContain('Stop');
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
