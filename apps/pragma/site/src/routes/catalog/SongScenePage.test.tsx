import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';

const fixture = vi.hoisted(() => ({ hasChordPro: true }));

vi.mock('../../lib/queries/songs.queries', () => ({
  useSong: () => ({
    data: {
      song: {
        id: 'song-1',
        title: 'Take Five',
        artist: 'Dave Brubeck',
        tonalityStart: 'Ebm',
        tonalityEnd: null,
        baseEnergy: 5,
        defaultLineup: { lea: ['guitar'] },
        charts: [
          { kind: 'pdf', s3Key: 'chart/song-1/tab.pdf', instrumentIds: ['guitar'], label: null },
          fixture.hasChordPro
            ? {
                kind: 'chordpro',
                text: '{title: Take Five}\n[Cm]Take five',
                instrumentIds: [],
                label: null,
              }
            : { kind: 'image', s3Key: 'chart/song-1/grid.png', instrumentIds: [], label: null },
        ],
        structureNotes: '',
        gimmickNotes: '',
        notes: '',
      },
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../lib/queries/me.queries', () => ({
  useSignedInMember: () => ({ data: { memberId: 'lea' } }),
}));

vi.mock('../../lib/queries/instruments.queries', () => ({
  useInstrumentsList: () => ({ data: { instruments: [{ id: 'guitar', name: 'Guitare' }] } }),
}));

const { SongScenePage } = await import('./SongScenePage');

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
}

describe('SongScenePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderScene(): void {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/catalog/song-1/scene']}>
          <Routes>
            <Route path="/catalog/:songId/scene" element={<SongScenePage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  }

  function press(label: string): void {
    const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    act(() => button?.click());
  }

  function readouts(): readonly (string | null)[] {
    return [...container.querySelectorAll('dialog span.tabular-nums')].map(
      (readout) => readout.textContent,
    );
  }

  beforeEach(() => {
    localStorage.clear();
    stubDialogModalMissingFromJsdom();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    renderScene();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    fixture.hasChordPro = true;
  });

  it('keeps its header below the status bar of a phone with a notch', () => {
    expect(container.querySelector('dialog h2')?.textContent).toBe('Take Five');
    expect(container.querySelector('dialog header')?.className).toContain(
      'pt-[calc(1rem+env(safe-area-inset-top))]',
    );
  });

  it('shows the ChordPro chart when the Guitare chart of a guitarist is a PDF, with no switcher', () => {
    expect(container.textContent).toContain('Take five');
    expect(container.textContent).not.toContain('No ChordPro chart');
    expect(container.querySelector('[role=tablist]')).toBeNull();
  });

  it('says the song has no ChordPro chart when every chart is a file', () => {
    fixture.hasChordPro = false;
    renderScene();
    expect(container.textContent).toContain('No ChordPro chart attached to this song.');
  });

  it('opens again with the transposition, the zoom and the scroll speed the musician left', () => {
    press('Transpose up');
    press('Zoom in');
    press('Scroll faster');
    act(() => root.unmount());
    root = createRoot(container);
    renderScene();

    expect(readouts()).toEqual(['+1', '40']);
    expect(
      container.querySelector<HTMLElement>('dialog [style*="font-size"]')?.style.fontSize,
    ).toBe('26px');
  });

  it('paints the status bar like the stage while open and gives it back on leaving', () => {
    const themeColour = document.createElement('meta');
    themeColour.name = 'theme-color';
    themeColour.content = '#f5f1e8';
    document.head.append(themeColour);
    act(() => root.unmount());
    root = createRoot(container);
    renderScene();
    expect(themeColour.content).not.toBe('#f5f1e8');

    act(() => root.unmount());
    root = createRoot(container);
    expect(themeColour.content).toBe('#f5f1e8');
    themeColour.remove();
  });
});
