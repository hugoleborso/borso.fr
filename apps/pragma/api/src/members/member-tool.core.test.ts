import { describe, expect, it } from 'vitest';
import { projectMemberForTool } from './member-tool.core';

const HUGO = { id: 'member-hugo', firstName: 'Hugo', phone: '0600000000', email: null };
const INSTRUMENTS = [
  {
    name: 'Batterie',
    players: [{ memberId: 'member-hugo' }, { memberId: 'member-lea' }],
  },
  { name: 'Chant', players: [{ memberId: 'member-hugo' }] },
  { name: 'Guitare', players: [{ memberId: 'member-lea' }] },
];

// @FollowsBlueprint test-pure-unit
describe('projectMemberForTool', () => {
  it('lists the instruments the member plays', () => {
    expect(projectMemberForTool(HUGO, INSTRUMENTS)).toEqual({
      id: 'member-hugo',
      firstName: 'Hugo',
      phone: '0600000000',
      email: null,
      instruments: ['Batterie', 'Chant'],
    });
  });

  it('lists no instrument for a member who plays none', () => {
    expect(projectMemberForTool({ ...HUGO, id: 'member-marc' }, INSTRUMENTS)).toEqual({
      id: 'member-marc',
      firstName: 'Hugo',
      phone: '0600000000',
      email: null,
      instruments: [],
    });
  });
});
