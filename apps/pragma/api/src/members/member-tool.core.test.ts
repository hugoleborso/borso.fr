import { describe, expect, it } from 'vitest';
import { projectMemberForTool } from './member-tool.core';

const HUGO = { id: 'member-hugo', firstName: 'Hugo', phone: '0600000000', email: null };
const INSTRUMENTS = [
  {
    name: 'Batterie',
    players: [
      { memberId: 'member-hugo', isPrimary: true },
      { memberId: 'member-lea', isPrimary: false },
    ],
  },
  { name: 'Chant', players: [{ memberId: 'member-hugo', isPrimary: false }] },
  { name: 'Guitare', players: [{ memberId: 'member-lea', isPrimary: true }] },
];

// @FollowsBlueprint test-pure-unit
describe('projectMemberForTool', () => {
  it('lists the instruments the member plays, and which are their main ones', () => {
    expect(projectMemberForTool(HUGO, INSTRUMENTS)).toEqual({
      id: 'member-hugo',
      firstName: 'Hugo',
      phone: '0600000000',
      email: null,
      instruments: ['Batterie', 'Chant'],
      main: ['Batterie'],
    });
  });

  it('leaves out the main instruments of a member who has none', () => {
    expect(projectMemberForTool({ ...HUGO, id: 'member-marc' }, INSTRUMENTS)).toEqual({
      id: 'member-marc',
      firstName: 'Hugo',
      phone: '0600000000',
      email: null,
      instruments: [],
    });
  });
});
