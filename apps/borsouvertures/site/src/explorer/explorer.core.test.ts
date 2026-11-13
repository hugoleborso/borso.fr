import { describe, expect, it } from 'vitest';
import openingsJson from '@/openings/openings.json';
import { parseOpenings } from '@/openings/parseOpenings.utils';
import type { Opening } from '@/openings/types';
import {
  applyExplorerMove,
  type ExplorerLine,
  type ExplorerPosition,
  flattenExplorerLines,
  listCandidateMoves,
  selectExplorerPosition,
  selectLastMoveSquares,
  selectShownNames,
  takeBackMove,
} from './explorer.core';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function buildLine(
  openingName: string,
  variationName: string,
  lineName: string,
  movesUci: string[],
): ExplorerLine {
  return { openingName, variationName, lineName, movesUci };
}

const LINES: ExplorerLine[] = [
  buildLine('Sicilian Defense', 'Main Line', 'Sicilian Defense', ['e2e4', 'c7c5']),
  buildLine('Sicilian Defense', 'Closed', 'Sicilian Defense: Closed', ['e2e4', 'c7c5', 'b1c3']),
  buildLine('Sicilian Defense', 'Closed', 'Sicilian Defense: Closed, Traditional', [
    'e2e4',
    'c7c5',
    'b1c3',
    'b8c6',
  ]),
  buildLine('Sicilian Defense', 'Alapin Variation', 'Sicilian Defense: Alapin Variation', [
    'e2e4',
    'c7c5',
    'c2c3',
  ]),
  buildLine('French Defense', 'Main Line', 'French Defense', ['e2e4', 'e7e6']),
  buildLine("Queen's Gambit Declined", 'Main Line', "Queen's Gambit Declined", [
    'd2d4',
    'd7d5',
    'c2c4',
    'e7e6',
  ]),
];

function namesOf(position: ExplorerPosition): string[][] {
  return position.groups.map((group) => [
    group.level,
    ...group.candidates.map((candidate) => `${candidate.moveSan}: ${candidate.names.join(', ')}`),
  ]);
}

// @FollowsBlueprint test-pure-unit
describe('flattenExplorerLines', () => {
  it('names each line with its opening and its variation', () => {
    const openings: Opening[] = [
      {
        id: 'sicilian-defense',
        name: 'Sicilian Defense',
        ecoCodes: ['B20'],
        variations: [
          {
            id: 'closed',
            name: 'Closed',
            lines: [
              {
                id: 'closed-1',
                name: 'Sicilian Defense: Closed',
                eco: 'B23',
                movesSan: ['e4', 'c5', 'Nc3'],
                movesUci: ['e2e4', 'c7c5', 'b1c3'],
              },
            ],
          },
        ],
      },
    ];
    expect(flattenExplorerLines(openings)).toEqual([LINES[1]]);
  });
});

describe('selectExplorerPosition', () => {
  it('shows from the start which openings each move leads to, most lines first', () => {
    const position = selectExplorerPosition(LINES, []);
    expect(position).toMatchObject({
      fen: STARTING_FEN,
      movesSan: [],
      isInBook: true,
      lastNamed: null,
    });
    expect(namesOf(position)).toEqual([
      ['opening', 'e4: Sicilian Defense, French Defense'],
      ['line', "d4: Queen's Gambit Declined"],
    ]);
  });

  it('shows variations once one opening is reached, then lines once one variation is', () => {
    const sicilian = selectExplorerPosition(LINES, ['e2e4', 'c7c5']);
    expect(sicilian.lastNamed).toEqual({ name: 'Sicilian Defense', plyCount: 2 });
    expect(sicilian.movesSan).toEqual(['e4', 'c5']);
    expect(namesOf(sicilian)).toEqual([
      [
        'line',
        'Nc3: Sicilian Defense: Closed, Sicilian Defense: Closed, Traditional',
        'c3: Sicilian Defense: Alapin Variation',
      ],
    ]);
    const twoVariations = selectExplorerPosition(
      [
        ...LINES,
        buildLine('Sicilian Defense', 'Chameleon', 'Sicilian Defense: Chameleon', [
          'e2e4',
          'c7c5',
          'b1c3',
          'e7e6',
        ]),
      ],
      ['e2e4', 'c7c5'],
    );
    expect(namesOf(twoVariations)[0]).toEqual([
      'variation',
      'Nc3: Sicilian Defense: Closed, Sicilian Defense: Chameleon',
    ]);
  });

  it('describes each candidate: its move, the position after it, its count, its own name and whether the book goes on', () => {
    const [group] = selectExplorerPosition(LINES, ['e2e4', 'c7c5']).groups;
    expect(group?.candidates[0]).toEqual({
      moveUci: 'b1c3',
      moveSan: 'Nc3',
      fenAfter: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
      lineCount: 2,
      level: 'line',
      names: ['Sicilian Defense: Closed', 'Sicilian Defense: Closed, Traditional'],
      namedHere: 'Sicilian Defense: Closed',
      hasFurtherMoves: true,
    });
    expect(group?.candidates[1]).toMatchObject({
      moveSan: 'c3',
      namedHere: 'Sicilian Defense: Alapin Variation',
      hasFurtherMoves: false,
    });
  });

  it('names what a move leads to by line count, then alphabetically', () => {
    const position = selectExplorerPosition(
      [
        buildLine('Zukertort Opening', 'Main Line', 'Zukertort Opening', ['g1f3', 'd7d5']),
        buildLine('Reti Opening', 'Main Line', 'Reti Opening', ['g1f3', 'c7c5']),
        buildLine('Reti Opening', 'Main Line', 'Reti Opening', ['g1f3', 'e7e5']),
        buildLine('Indian Game', 'Main Line', 'Indian Game', ['g1f3', 'g8f6']),
      ],
      [],
    );
    expect(position.groups[0]?.candidates[0]?.names).toEqual([
      'Reti Opening',
      'Indian Game',
      'Zukertort Opening',
    ]);
  });

  it('orders candidates of equal count by their notation', () => {
    const position = selectExplorerPosition(
      [
        buildLine('French Defense', 'Main Line', 'French Defense', ['e2e4', 'e7e6']),
        buildLine('Caro-Kann Defense', 'Main Line', 'Caro-Kann Defense', ['e2e4', 'c7c6']),
      ],
      ['e2e4'],
    );
    expect(listCandidateMoves(position)).toEqual(['c7c6', 'e7e6']);
  });

  it('keeps the last named opening once the moves leave the book', () => {
    const position = selectExplorerPosition(LINES, ['e2e4', 'c7c5', 'b1c3', 'a7a6']);
    expect(position).toMatchObject({
      isInBook: false,
      lastNamed: { name: 'Sicilian Defense: Closed', plyCount: 3 },
      groups: [],
    });
    expect(selectExplorerPosition(LINES, ['a2a3']).lastNamed).toBeNull();
  });

  it('stops replaying at a move the board refuses', () => {
    expect(selectExplorerPosition(LINES, ['e2e4', 'e2e4']).movesSan).toEqual(['e4']);
  });

  it('reads the shipped dataset: 1. e4 c5 2. Nc3 is the Closed Sicilian', () => {
    const lines = flattenExplorerLines(parseOpenings(openingsJson));
    const start = selectExplorerPosition(lines, []);
    expect(listCandidateMoves(start)).toEqual(
      expect.arrayContaining(['e2e4', 'd2d4', 'c2c4', 'g1f3']),
    );
    expect(selectExplorerPosition(lines, ['e2e4']).lastNamed).toBeNull();
    expect(selectExplorerPosition(lines, ['e2e4', 'c7c5']).lastNamed?.name).toBe(
      'Sicilian Defense',
    );
    expect(selectExplorerPosition(lines, ['e2e4', 'c7c5', 'b1c3']).lastNamed?.name).toBe(
      'Sicilian Defense: Closed',
    );
  });
});

describe('the moves on the board', () => {
  it('plays a legal move, promoting to a queen when the drop names no piece', () => {
    expect(applyExplorerMove(['e2e4'], 'c7c5')).toEqual(['e2e4', 'c7c5']);
    expect(applyExplorerMove(['e2e4'], 'e2e4')).toBeNull();
    const promotion = ['a2a4', 'h7h5', 'a4a5', 'h5h4', 'a5a6', 'h4h3', 'a6b7', 'h3g2', 'b7a8'];
    expect(applyExplorerMove(promotion.slice(0, -1), 'b7a8')).toEqual([
      ...promotion.slice(0, -1),
      'b7a8q',
    ]);
  });

  it('takes back the last move, and nothing at the start', () => {
    expect(takeBackMove(['e2e4', 'c7c5'])).toEqual(['e2e4']);
    expect(takeBackMove([])).toEqual([]);
  });
});

describe('what a candidate row shows', () => {
  const candidate = {
    moveUci: 'b1c3',
    moveSan: 'Nc3',
    fenAfter: STARTING_FEN,
    lineCount: 4,
    level: 'line' as const,
    names: ['Closed, Traditional', 'Closed', 'Closed, Fianchetto', 'Closed, Grob'],
    namedHere: 'Closed',
    hasFurtherMoves: true,
  };

  it('names the position the move reaches first, then the most common names, and counts the rest', () => {
    expect(selectShownNames(candidate)).toEqual({
      shown: ['Closed', 'Closed, Traditional'],
      hiddenCount: 2,
      hasHiddenNames: true,
    });
    expect(selectShownNames({ ...candidate, namedHere: null, names: ['Closed'] })).toEqual({
      shown: ['Closed'],
      hiddenCount: 0,
      hasHiddenNames: false,
    });
  });

  it('marks the two squares of the last move', () => {
    expect(selectLastMoveSquares(['e2e4', 'a7a8q'])).toEqual(['a7', 'a8']);
    expect(selectLastMoveSquares([])).toEqual([]);
  });
});
