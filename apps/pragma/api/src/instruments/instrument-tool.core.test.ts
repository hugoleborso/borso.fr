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
  players: [{ memberId: 'member-hugo' }, { memberId: 'member-lea' }],
};

// @FollowsBlueprint test-pure-unit
describe('projectInstrumentForTool', () => {
  it('names the players', () => {
    expect(projectInstrumentForTool(VOICE, MEMBERS)).toEqual({
      id: 'instrument-voice',
      name: 'Chant',
      family: 'vocal',
      players: ['Hugo', 'Léa'],
    });
  });

  it('names no player when nobody plays it', () => {
    expect(projectInstrumentForTool({ ...VOICE, players: [] }, MEMBERS)).toEqual({
      id: 'instrument-voice',
      name: 'Chant',
      family: 'vocal',
      players: [],
    });
  });
});
