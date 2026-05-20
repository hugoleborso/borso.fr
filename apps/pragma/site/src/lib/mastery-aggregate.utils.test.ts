import { describe, expect, it } from 'vitest';
import { meanMasteryForSong } from './mastery-aggregate.utils';

describe('meanMasteryForSong', () => {
  it('returns null for an empty lineup', () => {
    expect(meanMasteryForSong({}, [])).toBeNull();
  });

  it('returns null when no defaults match the lineup pairs', () => {
    const lineup = { 'm1': 'i1' };
    const defaults = [{ memberId: 'm2', instrumentId: 'i2', score: 7 }];
    expect(meanMasteryForSong(lineup, defaults)).toBeNull();
  });

  it('averages the matching default scores', () => {
    const lineup = { 'm1': 'i1', 'm2': 'i2' };
    const defaults = [
      { memberId: 'm1', instrumentId: 'i1', score: 6 },
      { memberId: 'm2', instrumentId: 'i2', score: 8 },
    ];
    expect(meanMasteryForSong(lineup, defaults)).toBe(7);
  });

  it('skips lineup entries set to null (absent for this song)', () => {
    const lineup = { 'm1': 'i1', 'm2': null };
    const defaults = [
      { memberId: 'm1', instrumentId: 'i1', score: 5 },
      { memberId: 'm2', instrumentId: 'i2', score: 10 },
    ];
    expect(meanMasteryForSong(lineup, defaults)).toBe(5);
  });

  it('skips members whose pair has no default row', () => {
    const lineup = { 'm1': 'i1', 'm2': 'i2' };
    const defaults = [{ memberId: 'm1', instrumentId: 'i1', score: 4 }];
    expect(meanMasteryForSong(lineup, defaults)).toBe(4);
  });

  it('handles a single matched pair', () => {
    const lineup = { 'm1': 'i1' };
    const defaults = [{ memberId: 'm1', instrumentId: 'i1', score: 9 }];
    expect(meanMasteryForSong(lineup, defaults)).toBe(9);
  });
});
