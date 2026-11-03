import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';

const order = vi.hoisted(() => ({
  entries: {
    data: {
      entries: [
        { id: 'entry-1', setlistId: 'set-1', songId: 'song-1', position: 0, energy: null },
        { id: 'entry-2', setlistId: 'set-1', songId: 'song-2', position: 1, energy: null },
      ],
    },
    isError: false,
    isFetchedAfterMount: false,
  },
  updateEntry: vi.fn<(variables: unknown, options: { onError: () => void }) => void>(),
}));

vi.mock('../../lib/queries/setlists.queries', () => ({
  useSetlist: () => ({ data: { setlist: { id: 'set-1', name: 'Concert' } }, isLoading: false }),
}));

vi.mock('../../lib/queries/setlist-entries.queries', () => ({
  useSetlistEntriesToReorder: () => order.entries,
  useReorderSetlist: () => ({ mutate: vi.fn() }),
  useUpdateSetlistEntry: () => ({ mutate: order.updateEntry }),
}));

vi.mock('../../lib/queries/songs.queries', () => ({
  useSongsList: () => ({ data: { songs: [] }, isLoading: false }),
}));

const { SetlistOrderPage } = await import('./SetlistOrderPage');

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @FollowsBlueprint test-component-render
describe('SetlistOrderPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    order.entries.isError = false;
    order.entries.isFetchedAfterMount = false;
    order.updateEntry.mockReset();
  });

  function renderPage(): void {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/setlists/set-1/order']}>
          <Routes>
            <Route path="/setlists/:setlistId/order" element={<SetlistOrderPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  }

  it('offers no row to drag while the order on screen is a saved copy the server has not confirmed', () => {
    renderPage();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  it('offers the rows once the server answered after the page opened', () => {
    order.entries.isFetchedAfterMount = true;
    renderPage();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('says the order could not be loaded instead of offering the saved copy', () => {
    order.entries.isError = true;
    renderPage();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  it('saves the energy changed on a row, and says so when the save fails', () => {
    order.entries.isFetchedAfterMount = true;
    renderPage();
    const meter = container.querySelector('[role="slider"]');
    act(() => {
      meter?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(order.updateEntry).toHaveBeenCalledExactlyOnceWith(
      { setlistId: 'set-1', entryId: 'entry-1', energy: 6 },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
    const [, options] = order.updateEntry.mock.calls[0] ?? [];
    act(() => {
      options?.onError();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'The change was not saved. Check the connection and try again.',
    );
  });
});
