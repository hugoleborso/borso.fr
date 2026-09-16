import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act, type JSX } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSongLongPress } from '../../lib/song-long-press.hook';
import { ListenLinksProvider } from './ListenLinksProvider';

const LONG_PRESS_MS = 500;

function stubShowModal(this: HTMLDialogElement): void {
  this.setAttribute('open', '');
}

function stubClose(this: HTMLDialogElement): void {
  this.removeAttribute('open');
}

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value: stubShowModal,
});
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value: stubClose,
});

function SongRow(): JSX.Element {
  const handlers = useSongLongPress({
    title: 'Get Lucky',
    artist: 'Daft Punk',
    deezerTrackId: '67238735',
    spotifyTrackId: '2Foc5Q5nqNiosCNqttzHof',
  });
  return (
    <button type="button" data-testid="row" {...handlers}>
      Get Lucky
    </button>
  );
}

function holdRow(row: HTMLElement): void {
  vi.useFakeTimers();
  fireEvent.pointerDown(row);
  act(() => {
    vi.advanceTimersByTime(LONG_PRESS_MS);
  });
  vi.useRealTimers();
}

function renderRow(): HTMLElement {
  render(
    <ListenLinksProvider>
      <SongRow />
    </ListenLinksProvider>,
  );
  return screen.getByTestId('row');
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ListenLinksProvider', () => {
  it('shows nothing until a song is held', () => {
    renderRow();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('opens the two listening addresses when a song is held', () => {
    holdRow(renderRow());
    const addresses = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(addresses).toEqual([
      'https://www.deezer.com/track/67238735',
      'https://open.spotify.com/track/2Foc5Q5nqNiosCNqttzHof',
    ]);
  });

  it('names the song it was opened for', () => {
    holdRow(renderRow());
    expect(screen.getByRole('heading', { name: 'Get Lucky' })).toBeTruthy();
  });
});
