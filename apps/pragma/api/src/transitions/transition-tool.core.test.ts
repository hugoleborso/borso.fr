import { describe, expect, it } from 'vitest';
import { projectTransitionComments } from './transition-tool.core';

const SONGS = [
  { id: 'song-creep', title: 'Creep' },
  { id: 'song-karma', title: 'Karma Police' },
];
const CREEP_TO_KARMA = { songAId: 'song-creep', songBId: 'song-karma', comment: 'No pause' };
const KARMA_TO_GONE = { songAId: 'song-karma', songBId: 'song-gone', comment: 'Capo off' };

// @FollowsBlueprint test-pure-unit
describe('projectTransitionComments', () => {
  it('names both songs of every transition, keeping the id of a song that is gone', () => {
    expect(projectTransitionComments([CREEP_TO_KARMA, KARMA_TO_GONE], SONGS, {})).toEqual([
      {
        from: 'Creep',
        to: 'Karma Police',
        fromId: 'song-creep',
        toId: 'song-karma',
        comment: 'No pause',
      },
      {
        from: 'Karma Police',
        to: 'song-gone',
        fromId: 'song-karma',
        toId: 'song-gone',
        comment: 'Capo off',
      },
    ]);
  });

  it('keeps the transitions leaving a song, reaching a song, or both', () => {
    const comments = [CREEP_TO_KARMA, KARMA_TO_GONE];
    const keep = (filter: { fromId?: string; toId?: string }) =>
      projectTransitionComments(comments, SONGS, filter).map((view) => view.comment);
    expect(keep({ fromId: 'song-karma' })).toEqual(['Capo off']);
    expect(keep({ toId: 'song-karma' })).toEqual(['No pause']);
    expect(keep({ fromId: 'song-creep', toId: 'song-karma' })).toEqual(['No pause']);
    expect(keep({ fromId: 'song-creep', toId: 'song-gone' })).toEqual([]);
  });
});
