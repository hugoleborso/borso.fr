import { describe, expect, it } from 'vitest';
import { comparePositionThenName, foldPlayersIntoInstruments } from './instrument-players.core';

const GUITAR = { id: 'guitar-id', name: 'Guitar', position: 1 };
const DRUMS = { id: 'drums-id', name: 'Drums', position: 2 };

// @FollowsBlueprint test-pure-unit
describe('foldPlayersIntoInstruments', () => {
  it('gives an instrument nobody plays an empty player list', () => {
    expect(foldPlayersIntoInstruments([GUITAR], [])).toEqual([{ ...GUITAR, players: [] }]);
  });

  it('gathers every member holding one instrument under it', () => {
    const folded = foldPlayersIntoInstruments(
      [GUITAR],
      [
        { instrumentId: 'guitar-id', memberId: 'ana' },
        { instrumentId: 'guitar-id', memberId: 'ben' },
      ],
    );
    expect(folded[0]?.players).toEqual([{ memberId: 'ana' }, { memberId: 'ben' }]);
  });

  it('drops a link pointing at an instrument the list does not carry', () => {
    const folded = foldPlayersIntoInstruments(
      [GUITAR],
      [{ instrumentId: 'tuba-id', memberId: 'ana' }],
    );
    expect(folded).toEqual([{ ...GUITAR, players: [] }]);
  });

  it('keeps each instrument with its own players', () => {
    const folded = foldPlayersIntoInstruments(
      [GUITAR, DRUMS],
      [
        { instrumentId: 'drums-id', memberId: 'cam' },
        { instrumentId: 'guitar-id', memberId: 'ana' },
      ],
    );
    expect(folded.map((row) => row.players.map((player) => player.memberId))).toEqual([
      ['ana'],
      ['cam'],
    ]);
  });
});

describe('comparePositionThenName', () => {
  it('orders by the stored position first', () => {
    expect(comparePositionThenName(GUITAR, DRUMS)).toBeLessThan(0);
    expect(comparePositionThenName(DRUMS, GUITAR)).toBeGreaterThan(0);
  });

  it('breaks a tie on the name, so two instruments at one position still settle', () => {
    expect(
      comparePositionThenName({ position: 0, name: 'Alto' }, { position: 0, name: 'Basse' }),
    ).toBeLessThan(0);
  });

  it('reports two identical rows as equal', () => {
    expect(
      comparePositionThenName({ position: 3, name: 'Alto' }, { position: 3, name: 'Alto' }),
    ).toBe(0);
  });
});
