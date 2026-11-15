import { describe, expect, it } from 'vitest';
import { buildSongLineupRows, type LineupInstrument } from './song-lineup.core';

const MEMBERS = [
  { id: 'ana', firstName: 'Ana', color: '#111111' },
  { id: 'bruno', firstName: 'Bruno', color: '#222222' },
];

const INSTRUMENTS: readonly LineupInstrument[] = [
  { id: 'guitar', name: 'Guitar', icon: 'guitar' },
  { id: 'bass', name: 'Bass', icon: 'bass' },
];

// @FollowsBlueprint test-pure-unit
describe('buildSongLineupRows', () => {
  it('reads a sitting-out member as holding nothing', () => {
    const rows = buildSongLineupRows({ ana: [] }, MEMBERS, INSTRUMENTS);

    expect(rows).toStrictEqual([
      { memberId: 'ana', memberName: 'Ana', memberColor: '#111111', instruments: [] },
    ]);
  });

  it('resolves the member, the instrument and its icon', () => {
    const rows = buildSongLineupRows({ ana: ['guitar'] }, MEMBERS, INSTRUMENTS);

    expect(rows).toStrictEqual([
      {
        memberId: 'ana',
        memberName: 'Ana',
        memberColor: '#111111',
        instruments: [{ instrumentId: 'guitar', instrumentName: 'Guitar', icon: 'guitar' }],
      },
    ]);
  });

  it('carries every instrument a member holds, in the order the lineup stores them', () => {
    const rows = buildSongLineupRows({ ana: ['bass', 'guitar'] }, MEMBERS, INSTRUMENTS);

    expect(rows[0]?.instruments).toStrictEqual([
      { instrumentId: 'bass', instrumentName: 'Bass', icon: 'bass' },
      { instrumentId: 'guitar', instrumentName: 'Guitar', icon: 'guitar' },
    ]);
  });

  it('drops a member who is no longer in the band', () => {
    const rows = buildSongLineupRows({ ghost: ['guitar'] }, MEMBERS, INSTRUMENTS);

    expect(rows).toStrictEqual([]);
  });

  it('drops an instrument the band no longer has', () => {
    const rows = buildSongLineupRows({ bruno: ['kazoo'] }, MEMBERS, INSTRUMENTS);

    expect(rows[0]?.instruments).toStrictEqual([]);
  });

  it('leaves an empty lineup empty', () => {
    expect(buildSongLineupRows({}, MEMBERS, INSTRUMENTS)).toStrictEqual([]);
  });
});
