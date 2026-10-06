import { describe, expect, it } from 'vitest';
import {
  indexMembersById,
  indexSongsById,
  isVotingPageState,
  projectPointsBySongId,
  selectCloseIntent,
  selectVoteHeaderAction,
  selectVotePageState,
} from './setlist-vote.core';

// @FollowsBlueprint test-pure-unit
describe('selectVotePageState', () => {
  it('waits while the board has not arrived', () => {
    expect(selectVotePageState({ hasBoard: false, status: 'voting', isClosingOpen: false })).toBe(
      'loading',
    );
  });

  it('shows the deck while the vote is open', () => {
    expect(selectVotePageState({ hasBoard: true, status: 'voting', isClosingOpen: false })).toBe(
      'voting',
    );
  });

  it('shows the proposal once the closing is asked for', () => {
    expect(selectVotePageState({ hasBoard: true, status: 'voting', isClosingOpen: true })).toBe(
      'closing',
    );
  });

  it('shows neither on a setlist that is not in its voting phase', () => {
    expect(selectVotePageState({ hasBoard: true, status: 'locked', isClosingOpen: false })).toBe(
      'locked',
    );
    expect(selectVotePageState({ hasBoard: true, status: 'locked', isClosingOpen: true })).toBe(
      'locked',
    );
  });
});

describe('isVotingPageState', () => {
  it('is true only while the deck is the thing to show', () => {
    expect(isVotingPageState('voting', false, true)).toBe(true);
    expect(isVotingPageState('voting', true, true)).toBe(false);
    expect(isVotingPageState('locked', false, true)).toBe(false);
    expect(isVotingPageState('voting', false, false)).toBe(false);
  });
});

describe('the vote page projections', () => {
  const SONGS = [
    { id: 'song-a', title: 'A', artist: 'Artist A' },
    { id: 'song-b', title: 'B', artist: 'Artist B' },
  ];

  it('indexes the songs by their identifier', () => {
    const indexed = indexSongsById(SONGS);
    expect(indexed.get('song-a')?.title).toBe('A');
    expect(indexed.get('song-z')).toBeUndefined();
    expect(indexSongsById([]).size).toBe(0);
  });

  it('indexes the members by their identifier', () => {
    const indexed = indexMembersById([{ id: 'member-ada', firstName: 'Ada', color: '#fff' }]);
    expect(indexed.get('member-ada')?.firstName).toBe('Ada');
    expect(indexMembersById([]).size).toBe(0);
  });

  it('reads the points of every song in the deck', () => {
    expect(projectPointsBySongId(SONGS, (songId) => (songId === 'song-a' ? 2 : 0))).toEqual({
      'song-a': 2,
      'song-b': 0,
    });
    expect(projectPointsBySongId([], () => 0)).toEqual({});
  });
});

describe('selectCloseIntent', () => {
  it('reviews the proposal once a song carries points', () => {
    expect(selectCloseIntent(1)).toBe('review-proposal');
  });

  it('locks the setlist as it stands when nobody scored', () => {
    expect(selectCloseIntent(0)).toBe('lock-unchanged');
  });
});

describe('selectVoteHeaderAction', () => {
  it('offers to close a running vote, to go back while closing, and to open one otherwise', () => {
    expect(selectVoteHeaderAction('voting')).toBe('close-vote');
    expect(selectVoteHeaderAction('closing')).toBe('back-to-vote');
    expect(selectVoteHeaderAction('locked')).toBe('open-vote');
    expect(selectVoteHeaderAction('loading')).toBe('open-vote');
  });
});
