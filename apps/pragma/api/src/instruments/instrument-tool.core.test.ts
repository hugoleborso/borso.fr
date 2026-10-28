import { describe, expect, it } from 'vitest';
import { projectInstrumentForTool } from './instrument-tool.core';
import type { InstrumentWithPlayersRow } from './instruments.repository';

const MEMBERS = [
  { id: 'member-hugo', name: 'Hugo' },
  { id: 'member-lea', name: 'Léa' },
];
const VOICE: InstrumentWithPlayersRow = {
  id: 'instrument-voice',
  name: 'Chant',
  family: 'vocal',
  icon: 'mic-vocal',
  position: 0,
  players: [
    { memberId: 'member-hugo', isPrimary: false },
    { memberId: 'member-lea', isPrimary: true },
  ],
};

// @FollowsBlueprint test-pure-unit
describe('projectInstrumentForTool', () => {
  it('names the players, and those for whom it is their main instrument', () => {
    expect(projectInstrumentForTool(VOICE, MEMBERS)).toEqual({
      id: 'instrument-voice',
      name: 'Chant',
      family: 'vocal',
      players: ['Hugo', 'Léa'],
      mainFor: ['Léa'],
    });
  });

  it('leaves out the main players when nobody holds it as main', () => {
    expect(projectInstrumentForTool({ ...VOICE, players: [] }, MEMBERS)).toEqual({
      id: 'instrument-voice',
      name: 'Chant',
      family: 'vocal',
      players: [],
    });
  });
});
