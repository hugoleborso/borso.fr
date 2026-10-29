import { describe, expect, it } from 'vitest';
import { buildLineupChips, type LineupChipInstrument } from './member-lineup.core';

const MEMBERS = [
  { id: 'hugo', name: 'Hugo', color: '#e87b62' },
  { id: 'lea', name: 'Léa', color: '#3a9b9b' },
  { id: 'marc', name: 'Marc', color: '#d6a93c' },
  { id: 'sarah', name: 'Sarah', color: '#8a4f7a' },
  { id: 'noa', name: 'Noa', color: '#7a9b6f' },
  { id: 'ines', name: 'Inès', color: '#4a6ea8' },
];

const INSTRUMENTS: readonly LineupChipInstrument[] = [
  { id: 'drums', name: 'Batterie' },
  { id: 'voice', name: 'Chant' },
  { id: 'bass', name: 'Basse' },
];

const MAXIMUM_VISIBLE = 4;

// @FollowsBlueprint test-pure-unit
describe('buildLineupChips', () => {
  it('names the member and every instrument they hold', () => {
    expect(
      buildLineupChips({ hugo: ['drums', 'voice'] }, MEMBERS, INSTRUMENTS, MAXIMUM_VISIBLE),
    ).toEqual({
      visible: [
        {
          memberId: 'hugo',
          memberName: 'Hugo',
          memberColor: '#e87b62',
          title: 'Hugo — Batterie + Chant',
        },
      ],
      hiddenCount: 0,
      hasHiddenMembers: false,
    });
  });

  it('titles a member holding nothing with their name alone', () => {
    expect(buildLineupChips({ lea: [] }, MEMBERS, INSTRUMENTS, MAXIMUM_VISIBLE).visible).toEqual([
      { memberId: 'lea', memberName: 'Léa', memberColor: '#3a9b9b', title: 'Léa' },
    ]);
  });

  it('drops an instrument the map does not know', () => {
    expect(
      buildLineupChips({ marc: ['bass', 'theremin'] }, MEMBERS, INSTRUMENTS, MAXIMUM_VISIBLE)
        .visible[0]?.title,
    ).toBe('Marc — Basse');
  });

  it('drops a member the roster does not know', () => {
    expect(buildLineupChips({ ghost: ['bass'] }, MEMBERS, INSTRUMENTS, MAXIMUM_VISIBLE)).toEqual({
      visible: [],
      hiddenCount: 0,
      hasHiddenMembers: false,
    });
  });

  it('counts the members past the cap once two or more would be hidden', () => {
    const chips = buildLineupChips(
      { hugo: [], lea: [], marc: [], sarah: [], noa: [], ines: [] },
      MEMBERS,
      INSTRUMENTS,
      MAXIMUM_VISIBLE,
    );
    expect(chips.visible.map((chip) => chip.memberId)).toEqual(['hugo', 'lea', 'marc', 'sarah']);
    expect(chips.hiddenCount).toBe(2);
    expect(chips.hasHiddenMembers).toBe(true);
  });

  it('draws the single member past the cap rather than a counter standing in for them', () => {
    const chips = buildLineupChips(
      { hugo: [], lea: [], marc: [], sarah: [], noa: [] },
      MEMBERS,
      INSTRUMENTS,
      MAXIMUM_VISIBLE,
    );
    expect(chips.visible.map((chip) => chip.memberId)).toEqual([
      'hugo',
      'lea',
      'marc',
      'sarah',
      'noa',
    ]);
    expect(chips.hiddenCount).toBe(0);
    expect(chips.hasHiddenMembers).toBe(false);
  });

  it('hides nobody when the lineup fits exactly', () => {
    const chips = buildLineupChips(
      { hugo: [], lea: [], marc: [], sarah: [] },
      MEMBERS,
      INSTRUMENTS,
      MAXIMUM_VISIBLE,
    );
    expect(chips.visible).toHaveLength(MAXIMUM_VISIBLE);
    expect(chips.hasHiddenMembers).toBe(false);
  });

  it('reads an empty lineup as no chips at all', () => {
    expect(buildLineupChips({}, MEMBERS, INSTRUMENTS, MAXIMUM_VISIBLE)).toEqual({
      visible: [],
      hiddenCount: 0,
      hasHiddenMembers: false,
    });
  });
});
