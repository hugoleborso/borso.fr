import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { SongDetailHeader, type SongDetailHeaderProps } from './SongDetailHeader';

const PREVIEW_URL = 'https://cdnt-preview.dzcdn.net/api/1/1/c/8/a/0/c8a6.mp3?hdnea=exp=1';

function renderHeader(overrides: Partial<SongDetailHeaderProps> = {}): void {
  render(
    <MemoryRouter>
      <SongDetailHeader
        song={{
          id: 'song-1',
          title: 'Get Lucky',
          artist: 'Daft Punk',
          status: 'wip',
          deezerAlbumId: null,
        }}
        previewUrl={PREVIEW_URL}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

// @FollowsBlueprint test-component-render
describe('SongDetailHeader', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the song, its artist and its status', () => {
    renderHeader();
    expect(screen.getByRole('heading', { level: 1, name: 'Get Lucky' })).toBeTruthy();
    expect(screen.getByText('Daft Punk')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy();
  });

  it('offers the excerpt over the cover when the song has one', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Play a 30-second excerpt' })).toBeTruthy();
    expect(document.querySelector('audio')?.getAttribute('src')).toBe(PREVIEW_URL);
  });

  it('draws no play button for a song with no excerpt', () => {
    renderHeader({ previewUrl: null });
    expect(screen.queryByRole('button', { name: 'Play a 30-second excerpt' })).toBeNull();
    expect(document.querySelector('audio')).toBeNull();
  });

  it('opens the song edit page in one tap, with no menu to open first', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe(
      '/catalog/song-1/edit',
    );
    expect(screen.queryByRole('button', { name: 'More actions on this song' })).toBeNull();
  });
});
