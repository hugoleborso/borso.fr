import { describe, expect, it } from 'vitest';
import { EXAMPLE_DECK } from '../decks/deck-build.test-utils';
import {
  buildTrapsDocument,
  formatTrapCounts,
  isTrapOfDeck,
  listTrapCandidates,
  listTrapDeckFilters,
  type PuzzleRow,
  parsePuzzleRow,
  type TrapCandidate,
  type TrapDeckFilter,
} from './puzzle-row.core';

const FEN = 'r2qk1nr/ppp2pbp/6p1/4n3/1PPp2b1/P4N2/1B1NPPPP/R2QKB1R w KQkq - 0 9';
const TAGS = 'Queens_Gambit_Declined Queens_Gambit_Declined_Albin_Countergambit';

function buildLine(
  change: Partial<Record<'id' | 'fen' | 'rating' | 'popularity' | 'plays', string>> = {},
) {
  const columns = {
    id: 'FUczt',
    fen: FEN,
    rating: '1237',
    popularity: '95',
    plays: '37538',
    ...change,
  };
  return `${columns.id},${columns.fen},f3d4 e5d3 e2d3 g4d1,${columns.rating},82,${columns.popularity},${columns.plays},advantage opening short,https://lichess.org/game/GYTYwqdy#17,${TAGS},`;
}

const ROW: PuzzleRow = {
  puzzleId: 'FUczt',
  fen: FEN,
  movesUci: ['f3d4', 'e5d3', 'e2d3', 'g4d1'],
  rating: 1237,
  popularity: 95,
  plays: 37538,
  openingTags: ['Queens_Gambit_Declined', 'Queens_Gambit_Declined_Albin_Countergambit'],
  readerSide: 'black',
  fullMoveNumber: 9,
};

const ALBIN: TrapDeckFilter = {
  deckId: 'albin-countergambit',
  side: 'black',
  openingTags: ['Queens_Gambit_Declined_Albin_Countergambit'],
};

const VIENNA: TrapDeckFilter = {
  deckId: 'vienna-game',
  side: 'white',
  openingTags: ['Vienna_Game'],
};

function buildCandidate(puzzleId: string, plays: number, deckId = ALBIN.deckId): TrapCandidate {
  return { trap: { puzzleId, deckId, fen: FEN, movesUci: ['f3d4', 'e5d3'], rating: 1200 }, plays };
}

// @FollowsBlueprint test-pure-unit
describe('parsePuzzleRow', () => {
  it('reads a row of the dump, and a row without the daily date column', () => {
    expect(parsePuzzleRow(buildLine())).toEqual(ROW);
    expect(parsePuzzleRow(buildLine().slice(0, -1))).toEqual(ROW);
  });

  it('reads an empty column of opening tags as no tag', () => {
    const line = buildLine().replace(TAGS, '');
    expect(parsePuzzleRow(line)?.openingTags).toEqual([]);
  });

  it('gives the reader White when Black moves first', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(parsePuzzleRow(buildLine({ fen }))).toMatchObject({
      readerSide: 'white',
      fullMoveNumber: 1,
    });
  });

  it.each([
    [
      'the header',
      'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate',
    ],
    ['an empty line', ''],
    ['a row of nine columns', buildLine().split(',').slice(0, 9).join(',')],
    [
      'a FEN of five fields',
      buildLine({ fen: 'r2qk1nr/ppp2pbp/6p1/4n3/1PPp2b1/P4N2/1B1NPPPP/R2QKB1R w KQkq - 9' }),
    ],
    ['a FEN of seven fields', buildLine({ fen: `${FEN} 9` })],
    ['a FEN with no side to move', buildLine({ fen: FEN.replace(' w ', ' x ') })],
    [
      'a FEN that names a property as its side',
      buildLine({ fen: FEN.replace(' w ', ' constructor ') }),
    ],
    ['a FEN with no move number', buildLine({ fen: FEN.replace(' 9', ' nine') })],
    ['a rating that is no number', buildLine({ rating: 'high' })],
    ['a popularity that is no whole number', buildLine({ popularity: '9.5' })],
    ['plays that are no number', buildLine({ plays: 'many' })],
  ])('refuses %s', (_label, line) => {
    expect(parsePuzzleRow(line)).toBeNull();
  });
});

describe('isTrapOfDeck', () => {
  it('takes a row of the deck side, rating, popularity, move number and tags', () => {
    expect(isTrapOfDeck(ROW, ALBIN)).toBe(true);
    expect(isTrapOfDeck({ ...ROW, rating: 1000, popularity: 80, fullMoveNumber: 15 }, ALBIN)).toBe(
      true,
    );
    expect(isTrapOfDeck({ ...ROW, rating: 1700 }, ALBIN)).toBe(true);
  });

  const refusedChanges: [string, Partial<PuzzleRow>][] = [
    ['for the other side', { readerSide: 'white' }],
    ['rated below 1000', { rating: 999 }],
    ['rated above 1700', { rating: 1701 }],
    ['less popular than 80', { popularity: 79 }],
    ['after move 15', { fullMoveNumber: 16 }],
    ['with no tag of the deck', { openingTags: ['Queens_Gambit_Declined'] }],
  ];

  it.each(refusedChanges)('refuses a row %s', (_label, change) => {
    expect(isTrapOfDeck({ ...ROW, ...change }, ALBIN)).toBe(false);
  });
});

describe('listTrapDeckFilters', () => {
  it('reads the trap filter of every deck that parses, in deck order', () => {
    const vienna = {
      ...EXAMPLE_DECK,
      id: 'vienna-game',
      order: 4,
      side: 'white',
      trapFilter: { openingTags: ['Vienna_Game'] },
    };
    const albin = { ...EXAMPLE_DECK, trapFilter: { openingTags: ALBIN.openingTags } };
    const withoutFilter = { ...EXAMPLE_DECK, id: 'caro-kann', order: 3 };
    expect(listTrapDeckFilters([vienna, { id: 'broken' }, withoutFilter, albin])).toEqual([
      ALBIN,
      VIENNA,
    ]);
  });
});

describe('listTrapCandidates', () => {
  it('keeps a row under the first deck it fits, with its plays', () => {
    expect(
      listTrapCandidates(buildLine(), [VIENNA, ALBIN, { ...ALBIN, deckId: 'second' }]),
    ).toEqual([
      {
        trap: {
          puzzleId: 'FUczt',
          deckId: 'albin-countergambit',
          fen: FEN,
          movesUci: ROW.movesUci,
          rating: 1237,
        },
        plays: 37538,
      },
    ]);
  });

  it('drops a row that does not parse, or fits no deck', () => {
    expect(listTrapCandidates('', [ALBIN])).toEqual([]);
    expect(listTrapCandidates(buildLine(), [VIENNA])).toEqual([]);
  });
});

describe('buildTrapsDocument and formatTrapCounts', () => {
  it('keeps the ten most played traps of each deck, ties by puzzle id, with the filters and the date', () => {
    const albinCandidates = Array.from({ length: 11 }, (_, index) =>
      buildCandidate(`A${String(index).padStart(2, '0')}`, 100 + index),
    );
    const candidates = [
      buildCandidate('V2', 5, VIENNA.deckId),
      buildCandidate('V1', 5, VIENNA.deckId),
      ...albinCandidates,
    ];
    const document = buildTrapsDocument('2026-11-01', [ALBIN, VIENNA], candidates);
    expect(document.dumpLastModified).toBe('2026-11-01');
    expect(document.filters).toEqual({
      minimumRating: 1000,
      maximumRating: 1700,
      minimumPopularity: 80,
      maximumFullMoveNumber: 15,
      trapsPerDeck: 10,
      openingTagsByDeckId: {
        'albin-countergambit': ALBIN.openingTags,
        'vienna-game': VIENNA.openingTags,
      },
    });
    expect(document.traps.map((trap) => trap.puzzleId)).toEqual([
      'A10',
      'A09',
      'A08',
      'A07',
      'A06',
      'A05',
      'A04',
      'A03',
      'A02',
      'A01',
      'V1',
      'V2',
    ]);
    expect(formatTrapCounts(document)).toEqual([
      '[build-traps] albin-countergambit: 10 traps',
      '[build-traps] vienna-game: 2 traps',
    ]);
  });
});
