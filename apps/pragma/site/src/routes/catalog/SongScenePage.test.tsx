import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';

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
        chart: { kind: 'chordpro', text: '{title: Take Five}\n[Cm]Take five' },
        structureNotes: '',
        gimmickNotes: '',
        notes: '',
      },
    },
    isLoading: false,
    error: null,
  }),
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

  beforeEach(() => {
    stubDialogModalMissingFromJsdom();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/catalog/song-1/scene']}>
          <Routes>
            <Route path="/catalog/:songId/scene" element={<SongScenePage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('keeps its header below the status bar of a phone with a notch', () => {
    expect(container.querySelector('dialog h2')?.textContent).toBe('Take Five');
    expect(container.querySelector('dialog header')?.className).toContain(
      'pt-[calc(1rem+env(safe-area-inset-top))]',
    );
  });
});
