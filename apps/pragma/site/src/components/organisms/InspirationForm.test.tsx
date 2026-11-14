import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { EMPTY_INSPIRATION_FORM } from './inspiration-form.core';
import { InspirationForm } from './InspirationForm';

const HIT = {
  deezerTrackId: '1234',
  title: 'Call Me Maybe',
  artist: 'Carly Rae Jepsen',
  album: 'Kiss',
  deezerAlbumId: '5678',
  durationSeconds: 193,
  isrcs: [],
};
const PLAYING_SECOND = 47.6;

class FakePlayer {
  constructor(host: HTMLElement) {
    host.setAttribute('data-fake-player', 'true');
  }
  getCurrentTime(): number {
    return PLAYING_SECOND;
  }
  destroy(): void {
    return undefined;
  }
}

function renderForm() {
  const onSave = vi.fn(async (): Promise<void> => undefined);
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <InspirationForm
        isNew
        initialValues={EMPTY_INSPIRATION_FORM}
        onSave={onSave}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { onSave };
}

function readValue(label: string): string {
  const field = screen.getByLabelText(label);
  return field instanceof HTMLInputElement ? field.value : '';
}

function type(label: string | RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

// @FollowsBlueprint test-component-render
describe('the inspiration form', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('YT', { Player: FakePlayer });
    stub = stubFetch((request) =>
      Promise.resolve(
        new URL(request.url).pathname === '/api/songs/search'
          ? jsonResponse({ hits: [HIT] })
          : new Response(null, { status: 404 }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fills the title, artist and Deezer ids from a picked hit, and keeps a hand-typed title when nothing is picked', async () => {
    const { onSave } = renderForm();
    type('Title', 'Call me');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    fireEvent.click(await screen.findByRole('button', { name: /Call Me Maybe/ }));
    expect(readValue('Title')).toBe('Call Me Maybe');
    expect(readValue('Artist')).toBe('Carly Rae Jepsen');

    type('YouTube link', 'https://youtu.be/dQw4w9WgXcQ');
    type(/^Start/, '52');
    type(/^End/, '64');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Call Me Maybe',
        artist: 'Carly Rae Jepsen',
        deezerTrackId: '1234',
        deezerAlbumId: '5678',
        youtubeVideoId: 'dQw4w9WgXcQ',
      }),
    );

    type('Title', 'Call Me Maybe (live)');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Call Me Maybe (live)',
        deezerTrackId: null,
        deezerAlbumId: null,
      }),
    );
  });

  it('sets the start and end from the player’s current second', async () => {
    renderForm();
    type('YouTube link', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await waitFor(() => expect(document.querySelector('[data-fake-player="true"]')).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Set start here' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set end here' }));

    expect(readValue('Start (seconds) 0:47')).toBe('47');
    expect(readValue('End (seconds) 0:47')).toBe('47');
  });

  it('refuses a link that is not a YouTube video, and an end before the start', async () => {
    const { onSave } = renderForm();
    type('Title', 'In the Air Tonight');
    type('YouTube link', 'https://vimeo.com/1234');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Paste the link of one YouTube video.',
    );

    type('YouTube link', 'https://youtu.be/dQw4w9WgXcQ');
    type(/^Start/, '64');
    type(/^End/, '52');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('The end has to come after the start.'),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('links to a YouTube search for the artist and the title', () => {
    renderForm();
    type('Title', 'Call Me Maybe');
    type('Artist', 'Carly Rae Jepsen');
    expect(screen.getByRole('link', { name: /Search on YouTube/ }).getAttribute('href')).toBe(
      'https://www.youtube.com/results?search_query=Carly+Rae+Jepsen+Call+Me+Maybe',
    );
  });
});
