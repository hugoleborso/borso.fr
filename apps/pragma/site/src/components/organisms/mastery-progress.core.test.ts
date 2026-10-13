import { describe, expect, it } from 'vitest';
import { groupScoreChangesIntoSeries } from './mastery-progress.core';

// @FollowsBlueprint test-pure-unit
describe('mastery-progress.core', () => {
  it('groups the changes per member and instrument, in history order, and drops unknown members', () => {
    const series = groupScoreChangesIntoSeries(
      [
        { memberId: 'hugo', instrumentId: 'guitar', score: 4 },
        { memberId: 'lea', instrumentId: 'drums', score: 6 },
        { memberId: 'hugo', instrumentId: 'guitar', score: 7 },
        { memberId: 'ghost', instrumentId: 'guitar', score: 1 },
        { memberId: 'hugo', instrumentId: 'removed', score: 2 },
      ],
      [
        { id: 'hugo', firstName: 'Hugo', color: '#111' },
        { id: 'lea', firstName: 'Léa', color: '#222' },
      ],
      [
        { id: 'guitar', name: 'Guitare' },
        { id: 'drums', name: 'Batterie' },
      ],
    );
    expect(series).toEqual([
      {
        key: 'hugo:guitar',
        memberName: 'Hugo',
        memberColor: '#111',
        instrumentName: 'Guitare',
        scores: [4, 7],
      },
      {
        key: 'lea:drums',
        memberName: 'Léa',
        memberColor: '#222',
        instrumentName: 'Batterie',
        scores: [6],
      },
      {
        key: 'hugo:removed',
        memberName: 'Hugo',
        memberColor: '#111',
        instrumentName: '',
        scores: [2],
      },
    ]);
  });
});
