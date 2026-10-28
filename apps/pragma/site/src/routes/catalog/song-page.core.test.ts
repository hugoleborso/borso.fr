import { describe, expect, it } from 'vitest';
import {
  describeSetlistsOfSong,
  selectMemberLineupRow,
  selectPractisedState,
  selectSetlistsOfSong,
} from './song-page.core';

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

describe('selectPractisedState', () => {
  const lineup = { 'member-1': ['bass'], 'member-2': ['drums'] };

  it('offers the instruments the member holds, from the lineup and the study queue, once each', () => {
    const queue = [
      { songId: 'song-1', instrumentId: 'bass', isStudiedToday: false },
      { songId: 'song-1', instrumentId: 'voice', isStudiedToday: false },
      { songId: 'song-2', instrumentId: 'guitar', isStudiedToday: true },
    ];
    expect(selectPractisedState(lineup, queue, 'song-1', 'member-1')).toEqual({
      instrumentIds: ['bass', 'voice'],
      isPractisedToday: false,
    });
  });

  it('reads the song as practised today once every one of its queue rows was studied', () => {
    const queue = [{ songId: 'song-1', instrumentId: 'bass', isStudiedToday: true }];
    expect(selectPractisedState(lineup, queue, 'song-1', 'member-1').isPractisedToday).toBe(true);
  });

  it('does not read a song outside the queue as practised', () => {
    expect(selectPractisedState(lineup, [], 'song-1', 'member-1')).toEqual({
      instrumentIds: ['bass'],
      isPractisedToday: false,
    });
  });

  it('offers nothing before the signed-in member is known', () => {
    expect(selectPractisedState(lineup, [], 'song-1', null)).toEqual({
      instrumentIds: [],
      isPractisedToday: false,
    });
  });
});

describe('selectMemberLineupRow', () => {
  const rows = [
    { memberId: 'member-1', memberName: 'Ana', memberColor: '#000000', instruments: [] },
  ];

  it('finds the row of the member', () => {
    expect(selectMemberLineupRow(rows, 'member-1')?.memberName).toBe('Ana');
  });

  it('answers null for a member who does not play the song', () => {
    expect(selectMemberLineupRow(rows, 'member-2')).toBeNull();
  });
});
