import { describe, expect, it } from 'vitest';
import { EXAMPLE_TRAP_CARD } from '../../site/src/decks/deck.test-utils';
import { buildTrapCards, type TrapDeck } from './trap-cards.core';

const DECKS: TrapDeck[] = [
  { id: 'albin-countergambit', side: 'black' },
  { id: 'vienna-game', side: 'white' },
];

const TRAP = {
  puzzleId: 'FUczt',
  deckId: 'albin-countergambit',
  fen: EXAMPLE_TRAP_CARD.fen,
  movesUci: ['f3d4', 'e5d3', 'e2d3', 'g4d1'],
  rating: 1237,
};

function listProblems(change: Record<string, unknown>): string[] {
  return buildTrapCards({ traps: [{ ...TRAP, ...change }] }, DECKS).problems;
}

// @FollowsBlueprint test-pure-unit
describe('buildTrapCards', () => {
  it("splits a trap into the opponent's move and the solution, under its deck", () => {
    const build = buildTrapCards({ traps: [TRAP, { ...TRAP, puzzleId: 'Other1' }] }, DECKS);
    expect(build.problems).toEqual([]);
    expect([...build.cardsByDeckId]).toEqual([
      ['albin-countergambit', [EXAMPLE_TRAP_CARD, { ...EXAMPLE_TRAP_CARD, cardId: 'trap:Other1' }]],
    ]);
  });

  it.each([
    ['no record', null],
    ['a list', [TRAP]],
    ['traps that are no list', { traps: TRAP }],
    ['a function that carries traps', Object.assign(() => undefined, { traps: [TRAP] })],
  ])('refuses a document that is %s', (_label, document) => {
    const build = buildTrapCards(document, DECKS);
    expect(build.problems).toEqual(['traps.json must hold { "traps": [...] }']);
    expect(build.cardsByDeckId.size).toBe(0);
  });

  it.each([
    ['no record', 'FUczt'],
    ['a list', [TRAP]],
    ['a null', null],
    ['no puzzle id', { ...TRAP, puzzleId: undefined }],
    ['an empty deck id', { ...TRAP, deckId: '' }],
    ['a FEN that is no text', { ...TRAP, fen: 3 }],
    ['moves that are no list', { ...TRAP, movesUci: 'f3d4' }],
    ['no move at all', { ...TRAP, movesUci: [] }],
    ['an empty move', { ...TRAP, movesUci: ['f3d4', ''] }],
  ])('refuses an entry that is %s, and names its place', (_label, entry) => {
    const build = buildTrapCards({ traps: [TRAP, entry] }, DECKS);
    expect(build.problems).toEqual([
      'traps.json: trap 2 must hold "puzzleId", "deckId", "fen" and "movesUci"',
    ]);
    expect(build.cardsByDeckId.get('albin-countergambit')).toHaveLength(1);
  });

  it('refuses a trap of a deck that does not exist, and one listed twice', () => {
    const build = buildTrapCards({ traps: [TRAP, TRAP, { ...TRAP, deckId: 'gone' }] }, DECKS);
    expect(build.problems).toEqual([
      'traps.json: trap "FUczt" is listed twice',
      'traps.json: trap "FUczt" names the deck "gone", which does not exist',
    ]);
  });

  it.each([
    [{ puzzleId: 'FU-czt' }, 'trap "FU-czt" the puzzle id must hold letters and digits only'],
    [
      { movesUci: ['f3d4', 'e5d3', 'e2d3'] },
      `trap "FUczt" needs the opponent's move, then a solution that ends on a reader move`,
    ],
    [
      { movesUci: ['f3d4'] },
      `trap "FUczt" needs the opponent's move, then a solution that ends on a reader move`,
    ],
    [{ fen: 'not a position' }, 'trap "FUczt" the FEN is not a position'],
    [
      { deckId: 'vienna-game' },
      'trap "FUczt" the opponent moves first and the reader of "vienna-game" plays white',
    ],
    [{ movesUci: ['f3d5', 'e5d3'] }, 'trap "FUczt" move 1, "f3d5", is not legal'],
    [{ movesUci: ['f3d4', 'e5d3', 'e2d3', 'g4d2'] }, 'trap "FUczt" move 4, "g4d2", is not legal'],
  ])('refuses the trap %o', (change, problem) => {
    expect(listProblems(change)).toEqual([`traps.json: ${problem}`]);
  });
});
