import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { SONG_PAGE_TABS, SONG_VIEW_TABS } from '../../routes/catalog/song-view-tab.core';
import { SongViewTabs } from './SongViewTabs';

function readTabNames(): string[] {
  return screen.getAllByRole('tab').map((tab) => tab.textContent);
}

// @FollowsBlueprint test-component-render
describe('SongViewTabs', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the song page its three tabs, with the number of takes', () => {
    render(<SongViewTabs tabs={SONG_PAGE_TABS} value="info" takeCount={4} onChange={vi.fn()} />);
    expect(readTabNames()).toEqual(['Info', 'Chords', 'Takes (4)']);
  });

  it('names the takes tab plainly while their number is unknown', () => {
    render(<SongViewTabs tabs={SONG_PAGE_TABS} value="info" takeCount={null} onChange={vi.fn()} />);
    expect(readTabNames()).toEqual(['Info', 'Chords', 'Takes']);
  });

  it('keeps the lineup tab where a caller still asks for it', () => {
    render(<SongViewTabs tabs={SONG_VIEW_TABS} value="info" takeCount={null} onChange={vi.fn()} />);
    expect(readTabNames()).toEqual(['Info', 'Lineup', 'Chords', 'Takes']);
  });

  it('hands the chosen tab back', () => {
    const onChange = vi.fn();
    render(<SongViewTabs tabs={SONG_PAGE_TABS} value="info" takeCount={0} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Takes (0)' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Takes (0)' }));
    expect(onChange).toHaveBeenCalledWith('takes');
  });
});
