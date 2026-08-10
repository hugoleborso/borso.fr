import { describe, expect, it } from 'vitest';
import {
  buildMasteryKey,
  buildSongLineupRows,
  isMasteryBarFilled,
  MASTERY_BAR_COUNT,
} from './song-lineup.core';

const MEMBERS = [
  { id: 'ana', firstName: 'Ana', color: '#111111' },
  { id: 'bruno', firstName: 'Bruno', color: '#222222' },
];

const INSTRUMENTS = [
  { id: 'guitar', name: 'Guitar' },
  { id: 'bass', name: 'Bass' },
];

// @FollowsBlueprint test-pure-unit
describe('buildMasteryKey', () => {
  it('joins the pair the mastery lookup is keyed by', () => {
    expect(buildMasteryKey('ana', 'guitar')).toBe('ana::guitar');
  });
});

describe('isMasteryBarFilled', () => {
  it('fills as many bars as the score', () => {
    expect(isMasteryBarFilled(3, 0)).toBe(true);
    expect(isMasteryBarFilled(3, 2)).toBe(true);
    expect(isMasteryBarFilled(3, 3)).toBe(false);
  });

  it('fills nothing for a member nobody has rated', () => {
    expect(isMasteryBarFilled(null, 0)).toBe(false);
  });

  it('fills every bar at the top score', () => {
    expect(isMasteryBarFilled(MASTERY_BAR_COUNT, MASTERY_BAR_COUNT - 1)).toBe(true);
  });
});

describe('buildSongLineupRows', () => {
  it('reads a sitting-out member as unrated, not as playing an instrument keyed "null"', () => {
    const rows = buildSongLineupRows(
      { ana: null },
      MEMBERS,
      INSTRUMENTS,
      new Map([['ana::null', 9]]),
    );

    expect(rows).toStrictEqual([
      {
        memberId: 'ana',
        memberName: 'Ana',
        memberColor: '#111111',
        instrumentName: null,
        masteryScore: null,
      },
    ]);
  });

  it('resolves the member, the instrument and the mastery score', () => {
    const rows = buildSongLineupRows(
      { ana: 'guitar' },
      MEMBERS,
      INSTRUMENTS,
      new Map([['ana::guitar', 7]]),
    );

    expect(rows).toStrictEqual([
      {
        memberId: 'ana',
        memberName: 'Ana',
        memberColor: '#111111',
        instrumentName: 'Guitar',
        masteryScore: 7,
      },
    ]);
  });

  it('drops a member who is no longer in the band', () => {
    const rows = buildSongLineupRows({ ghost: 'guitar' }, MEMBERS, INSTRUMENTS, new Map());

    expect(rows).toStrictEqual([]);
  });

  it('reads an unknown instrument and an unrated pair as absent', () => {
    const rows = buildSongLineupRows({ bruno: 'kazoo' }, MEMBERS, INSTRUMENTS, new Map());

    expect(rows[0]?.instrumentName).toBeNull();
    expect(rows[0]?.masteryScore).toBeNull();
  });

  it('reads a member with no instrument assigned as unrated', () => {
    const rows = buildSongLineupRows(
      { ana: null },
      MEMBERS,
      INSTRUMENTS,
      new Map([['ana::guitar', 7]]),
    );

    expect(rows[0]?.instrumentName).toBeNull();
    expect(rows[0]?.masteryScore).toBeNull();
  });

  it('leaves an empty lineup empty', () => {
    expect(buildSongLineupRows({}, MEMBERS, INSTRUMENTS, new Map())).toStrictEqual([]);
  });
});
