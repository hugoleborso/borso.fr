import { describe, expect, it } from 'vitest';
import { describeSetlistsOfSong, selectSetlistsOfSong } from './song-page.core';

describe('selectSetlistsOfSong', () => {
  it('keeps the setlists holding the song, in the order given', () => {
    const setlists = [
      { id: 'b', name: 'Concert', songIds: ['song-1', 'song-2'] },
      { id: 'a', name: 'Practice', songIds: ['song-3'] },
      { id: 'c', name: 'Wedding', songIds: ['song-1'] },
    ];
    expect(selectSetlistsOfSong(setlists, 'song-1').map((setlist) => setlist.name)).toEqual([
      'Concert',
      'Wedding',
    ]);
  });
});

describe('describeSetlistsOfSong', () => {
  it('names every setlist holding the song on one line', () => {
    expect(
      describeSetlistsOfSong(
        [
          { id: 'a', name: 'Concert', songIds: ['song-1'] },
          { id: 'b', name: 'Practice', songIds: ['song-1'] },
        ],
        'song-1',
      ),
    ).toEqual({ messageKey: 'catalog.inSetlists', names: 'Concert, Practice' });
  });

  it('says when the song is in no setlist', () => {
    expect(describeSetlistsOfSong([], 'song-1')).toEqual({
      messageKey: 'catalog.inNoSetlist',
      names: '',
    });
  });
});
