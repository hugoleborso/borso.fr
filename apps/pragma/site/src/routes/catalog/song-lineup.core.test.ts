import { describe, expect, it } from 'vitest';
import {
  buildMasteryKey,
  buildSongLineupRows,
  flattenMasteryRows,
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
  it('reads a sitting-out member as holding nothing', () => {
    const rows = buildSongLineupRows({
      defaultLineup: { ana: [] },
      members: MEMBERS,
      instruments: INSTRUMENTS,
      masteryByMemberInstrument: new Map(),
    });

    expect(rows).toStrictEqual([
      { memberId: 'ana', memberName: 'Ana', memberColor: '#111111', instruments: [] },
    ]);
  });

  it('resolves the member, the instrument and the mastery score', () => {
    const rows = buildSongLineupRows({
      defaultLineup: { ana: ['guitar'] },
      members: MEMBERS,
      instruments: INSTRUMENTS,
      masteryByMemberInstrument: new Map([['ana::guitar', 7]]),
    });

    expect(rows).toStrictEqual([
      {
        memberId: 'ana',
        memberName: 'Ana',
        memberColor: '#111111',
        instruments: [{ instrumentId: 'guitar', instrumentName: 'Guitar', masteryScore: 7 }],
      },
    ]);
  });

  it('carries every instrument a member holds, each with its own score', () => {
    const rows = buildSongLineupRows({
      defaultLineup: { ana: ['guitar', 'bass'] },
      members: MEMBERS,
      instruments: INSTRUMENTS,
      masteryByMemberInstrument: new Map([['ana::guitar', 7]]),
    });

    expect(rows[0]?.instruments).toStrictEqual([
      { instrumentId: 'guitar', instrumentName: 'Guitar', masteryScore: 7 },
      { instrumentId: 'bass', instrumentName: 'Bass', masteryScore: null },
    ]);
  });

  it('drops a member who is no longer in the band', () => {
    const rows = buildSongLineupRows({
      defaultLineup: { ghost: ['guitar'] },
      members: MEMBERS,
      instruments: INSTRUMENTS,
      masteryByMemberInstrument: new Map(),
    });

    expect(rows).toStrictEqual([]);
  });

  it('drops an instrument the band no longer has', () => {
    const rows = buildSongLineupRows({
      defaultLineup: { bruno: ['kazoo'] },
      members: MEMBERS,
      instruments: INSTRUMENTS,
      masteryByMemberInstrument: new Map(),
    });

    expect(rows[0]?.instruments).toStrictEqual([]);
  });

  it('leaves an empty lineup empty', () => {
    expect(
      buildSongLineupRows({
        defaultLineup: {},
        members: MEMBERS,
        instruments: INSTRUMENTS,
        masteryByMemberInstrument: new Map(),
      }),
    ).toStrictEqual([]);
  });
});

describe('flattenMasteryRows', () => {
  it('answers one row per instrument held, carrying the member', () => {
    const rows = buildSongLineupRows({
      defaultLineup: { ana: ['guitar', 'bass'] },
      members: MEMBERS,
      instruments: INSTRUMENTS,
      masteryByMemberInstrument: new Map([['ana::guitar', 7]]),
    });

    expect(flattenMasteryRows(rows)).toStrictEqual([
      {
        memberId: 'ana',
        memberName: 'Ana',
        memberColor: '#111111',
        instrumentId: 'guitar',
        instrumentName: 'Guitar',
        masteryScore: 7,
      },
      {
        memberId: 'ana',
        memberName: 'Ana',
        memberColor: '#111111',
        instrumentId: 'bass',
        instrumentName: 'Bass',
        masteryScore: null,
      },
    ]);
  });

  it('answers nothing for a member holding nothing', () => {
    const rows = buildSongLineupRows({
      defaultLineup: { ana: [] },
      members: MEMBERS,
      instruments: INSTRUMENTS,
      masteryByMemberInstrument: new Map(),
    });
    expect(flattenMasteryRows(rows)).toStrictEqual([]);
  });
});
