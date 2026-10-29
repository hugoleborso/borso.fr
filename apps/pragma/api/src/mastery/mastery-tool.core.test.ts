import { describe, expect, it } from 'vitest';
import { nameScoreChanges, nameScores } from './mastery-tool.core';

const NAMES = {
  members: [
    { id: 'member-hugo', name: 'Hugo' },
    { id: 'member-lea', name: 'Léa' },
  ],
  instruments: [{ id: 'instrument-bass', name: 'Basse' }],
};
const HUGO = { memberId: 'member-hugo', instrumentId: 'instrument-bass', score: 6 };
const LEA = { memberId: 'member-lea', instrumentId: 'instrument-bass', score: 8 };

// @FollowsBlueprint test-pure-unit
describe('nameScores', () => {
  it('names the member and the instrument of every score', () => {
    expect(nameScores([HUGO, LEA], NAMES, undefined)).toEqual([
      { member: 'Hugo', instrument: 'Basse', score: 6 },
      { member: 'Léa', instrument: 'Basse', score: 8 },
    ]);
  });

  it('keeps the scores of one member', () => {
    expect(nameScores([HUGO, LEA], NAMES, 'member-lea')).toEqual([
      { member: 'Léa', instrument: 'Basse', score: 8 },
    ]);
  });
});

describe('nameScoreChanges', () => {
  it('names each change and writes when it happened as an ISO string', () => {
    expect(
      nameScoreChanges([{ ...HUGO, changedAt: new Date('2026-10-28T10:00:00.000Z') }], NAMES),
    ).toEqual([{ member: 'Hugo', instrument: 'Basse', score: 6, at: '2026-10-28T10:00:00.000Z' }]);
  });
});
