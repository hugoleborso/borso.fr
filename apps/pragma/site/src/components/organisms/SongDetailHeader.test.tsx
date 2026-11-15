import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { SongDetailHeader, type SongDetailHeaderProps } from './SongDetailHeader';

const PREVIEW_URL = 'https://cdnt-preview.dzcdn.net/api/1/1/c/8/a/0/c8a6.mp3?hdnea=exp=1';

function renderHeader(overrides: Partial<SongDetailHeaderProps> = {}): void {
  render(
    <MemoryRouter>
      <SongDetailHeader
        song={{
          title: 'Get Lucky',
          artist: 'Daft Punk',
          status: 'wip',
          deezerAlbumId: null,
        }}
        previewUrl={PREVIEW_URL}
        menuItems={[{ label: 'Edit', icon: 'edit', tone: 'default', onSelect: vi.fn() }]}
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

  it('names the song, its artist and its status, with no key and no edit button beside the menu', () => {
    renderHeader();
    expect(screen.getByRole('heading', { level: 1, name: 'Get Lucky' })).toBeTruthy();
    expect(screen.getByText('Daft Punk')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
    expect(screen.getByRole('button', { name: 'More actions on this song' })).toBeTruthy();
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

  it('keeps the edit action in the menu', () => {
    const onSelect = vi.fn();
    renderHeader({
      menuItems: [{ label: 'Edit', icon: 'edit', tone: 'default', onSelect }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'More actions on this song' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
