import { describe, expect, it } from 'vitest';
import { meanDefaultMasteryForSong } from './mastery-aggregate.core';

// @FollowsBlueprint test-pure-unit
describe('meanDefaultMasteryForSong', () => {
  it('returns null for an empty lineup', () => {
    expect(meanDefaultMasteryForSong({}, [])).toBeNull();
  });

  it('returns null when no defaults match the lineup pairs', () => {
    const lineup = { m1: ['i1'] };
    const defaults = [{ memberId: 'm2', instrumentId: 'i2', score: 7 }];
    expect(meanDefaultMasteryForSong(lineup, defaults)).toBeNull();
  });

  it('averages the matching default scores', () => {
    const lineup = { m1: ['i1'], m2: ['i2'] };
    const defaults = [
      { memberId: 'm1', instrumentId: 'i1', score: 6 },
      { memberId: 'm2', instrumentId: 'i2', score: 8 },
    ];
    expect(meanDefaultMasteryForSong(lineup, defaults)).toBe(7);
  });

  it('skips the members sitting the song out', () => {
    const lineup = { m1: ['i1'], m2: [] };
    const defaults = [
      { memberId: 'm1', instrumentId: 'i1', score: 5 },
      { memberId: 'm2', instrumentId: 'i2', score: 10 },
    ];
    expect(meanDefaultMasteryForSong(lineup, defaults)).toBe(5);
  });

  it('skips members whose pair has no default row', () => {
    const lineup = { m1: ['i1'], m2: ['i2'] };
    const defaults = [{ memberId: 'm1', instrumentId: 'i1', score: 4 }];
    expect(meanDefaultMasteryForSong(lineup, defaults)).toBe(4);
  });

  it('does not credit a sitting-out member to an instrument whose id is the text "null"', () => {
    const lineup = { m1: ['i1'], m2: [] };
    const defaults = [
      { memberId: 'm1', instrumentId: 'i1', score: 4 },
      { memberId: 'm2', instrumentId: 'null', score: 10 },
    ];
    expect(meanDefaultMasteryForSong(lineup, defaults)).toBe(4);
  });

  it('rates a member holding two instruments on each of them', () => {
    const lineup = { m1: ['i1', 'i2'] };
    const defaults = [
      { memberId: 'm1', instrumentId: 'i1', score: 4 },
      { memberId: 'm1', instrumentId: 'i2', score: 8 },
    ];
    expect(meanDefaultMasteryForSong(lineup, defaults)).toBe(6);
  });

  it('handles a single matched pair', () => {
    const lineup = { m1: ['i1'] };
    const defaults = [{ memberId: 'm1', instrumentId: 'i1', score: 9 }];
    expect(meanDefaultMasteryForSong(lineup, defaults)).toBe(9);
  });
});
