import { describe, expect, it } from 'vitest';
import { readSongPageTab, readTakeCountOfTab } from './song-view-tab.core';

// @FollowsBlueprint test-pure-unit
describe('readSongPageTab', () => {
  it('reads a tab named in the address, even when a take is selected', () => {
    expect(readSongPageTab('chords', true)).toBe('chords');
    expect(readSongPageTab('info', true)).toBe('info');
  });

  it('lands an old address naming the retired lineup tab on the info of the song', () => {
    expect(readSongPageTab('lineup', false)).toBe('info');
  });

  it('opens on the takes when a take is selected and no tab is named', () => {
    expect(readSongPageTab(null, true)).toBe('takes');
    expect(readSongPageTab('lineup', true)).toBe('takes');
  });

  it('opens on the info of the song for a missing or unknown tab', () => {
    expect(readSongPageTab(null, false)).toBe('info');
    expect(readSongPageTab('notes', false)).toBe('info');
  });
});

describe('readTakeCountOfTab', () => {
  it('counts the takes on the takes tab only', () => {
    expect(readTakeCountOfTab('takes', 3)).toBe(3);
    expect(readTakeCountOfTab('chords', 3)).toBeNull();
  });

  it('counts nothing while the takes are unknown', () => {
    expect(readTakeCountOfTab('takes', null)).toBeNull();
  });
});
