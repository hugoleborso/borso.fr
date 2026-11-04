import { describe, expect, it } from 'vitest';
import { readSongViewTab } from './song-view-tab.core';

// @FollowsBlueprint test-pure-unit
describe('readSongViewTab', () => {
  it('reads a tab named in the address, even when a take is selected', () => {
    expect(readSongViewTab('chords', false)).toBe('chords');
    expect(readSongViewTab('lineup', true)).toBe('lineup');
  });

  it('opens on the takes when a take is selected and no tab is named', () => {
    expect(readSongViewTab(null, true)).toBe('takes');
    expect(readSongViewTab('unknown', true)).toBe('takes');
  });

  it('opens on the info of the song for a missing or unknown tab', () => {
    expect(readSongViewTab(null, false)).toBe('info');
    expect(readSongViewTab('notes', false)).toBe('info');
  });
});
