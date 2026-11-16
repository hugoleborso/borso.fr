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
});
