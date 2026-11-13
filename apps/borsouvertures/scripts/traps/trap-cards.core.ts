import { Chess, type Color } from 'chess.js';
import { parseCardId } from '../../domain/review-event.core';
import { buildTrapCardId, type TrapCard } from '../../site/src/decks/deck.utils';
import { uciFromSquare, uciPromotion, uciToSquare } from '../../site/src/openings/uciSquare.utils';
import type { DeckSide } from '../decks/deck-source.core';

export interface TrapSource {
  puzzleId: string;
  deckId: string;
  fen: string;
  movesUci: string[];
  rating: number;
}

export interface TrapFilters {
  minimumRating: number;
  maximumRating: number;
  minimumPopularity: number;
  maximumFullMoveNumber: number;
  trapsPerDeck: number;
  openingTagsByDeckId: Record<string, string[]>;
}

export interface TrapsDocument {
  dumpLastModified: string;
  filters: TrapFilters;
  traps: TrapSource[];
}

export interface TrapDeck {
  id: string;
  side: DeckSide;
}

export interface TrapCardsBuild {
  cardsByDeckId: Map<string, TrapCard[]>;
  problems: string[];
}

interface TrapEntry {
  puzzleId: string;
  deckId: string;
  fen: string;
  opponentMoveUci: string;
  solutionUci: string[];
}

const FILE_LABEL = 'traps.json';
const PLIES_PER_FULL_MOVE = 2;
const SIDE_BY_TURN: Record<Color, DeckSide> = { w: 'white', b: 'black' };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseTrapEntry(value: unknown): TrapEntry | null {
  if (!isPlainRecord(value)) return null;
  const { puzzleId, deckId, fen, movesUci } = value;
  if (!isText(puzzleId) || !isText(deckId) || !isText(fen) || !Array.isArray(movesUci)) {
    return null;
  }
  const moves = movesUci.filter((move: unknown) => isText(move));
  const [opponentMoveUci, ...solutionUci] = moves;
  if (opponentMoveUci === undefined || moves.length !== movesUci.length) return null;
  return { puzzleId, deckId, fen, opponentMoveUci, solutionUci };
}

function replayMoves(fen: string, movesUci: readonly string[]): string | null {
  const game = new Chess(fen);
  for (const [index, uci] of movesUci.entries()) {
    try {
      game.move({ from: uciFromSquare(uci), to: uciToSquare(uci), promotion: uciPromotion(uci) });
    } catch {
      return `move ${index + 1}, "${uci}", is not legal`;
    }
  }
  return null;
}

function findTrapProblem(trap: TrapEntry, deck: TrapDeck): string | null {
  if (parseCardId(buildTrapCardId(trap.puzzleId))?.kind !== 'trap') {
    return 'the puzzle id must hold letters and digits only';
  }
  if (trap.solutionUci.length % PLIES_PER_FULL_MOVE === 0) {
    return "needs the opponent's move, then a solution that ends on a reader move";
  }
  let turn: Color;
  try {
    turn = new Chess(trap.fen).turn();
  } catch {
    return 'the FEN is not a position';
  }
  if (SIDE_BY_TURN[turn] === deck.side) {
    return `the opponent moves first and the reader of "${deck.id}" plays ${deck.side}`;
  }
  return replayMoves(trap.fen, [trap.opponentMoveUci, ...trap.solutionUci]);
}

function findDeckProblem(
  trap: TrapEntry,
  deck: TrapDeck | undefined,
  seenPuzzleIds: ReadonlySet<string>,
): string | null {
  if (deck === undefined) return `names the deck "${trap.deckId}", which does not exist`;
  if (seenPuzzleIds.has(trap.puzzleId)) return 'is listed twice';
  return findTrapProblem(trap, deck);
}

function buildTrapCard(trap: TrapEntry): TrapCard {
  return {
    kind: 'trap',
    cardId: buildTrapCardId(trap.puzzleId),
    deckId: trap.deckId,
    fen: trap.fen,
    opponentMoveUci: trap.opponentMoveUci,
    solutionUci: trap.solutionUci,
  };
}

// @FollowsBlueprint core-parse-untrusted
export function buildTrapCards(document: unknown, decks: readonly TrapDeck[]): TrapCardsBuild {
  const cardsByDeckId = new Map<string, TrapCard[]>();
  if (!isPlainRecord(document) || !Array.isArray(document.traps)) {
    return { cardsByDeckId, problems: [`${FILE_LABEL} must hold { "traps": [...] }`] };
  }
  const problems: string[] = [];
  const seenPuzzleIds = new Set<string>();
  for (const [index, value] of document.traps.entries()) {
    const trap = parseTrapEntry(value);
    if (trap === null) {
      problems.push(
        `${FILE_LABEL}: trap ${index + 1} must hold "puzzleId", "deckId", "fen" and "movesUci"`,
      );
      continue;
    }
    const deck = decks.find((candidate) => candidate.id === trap.deckId);
    const problem = findDeckProblem(trap, deck, seenPuzzleIds);
    seenPuzzleIds.add(trap.puzzleId);
    if (problem === null) {
      cardsByDeckId.set(trap.deckId, [
        ...(cardsByDeckId.get(trap.deckId) ?? []),
        buildTrapCard(trap),
      ]);
    } else {
      problems.push(`${FILE_LABEL}: trap "${trap.puzzleId}" ${problem}`);
    }
  }
  return { cardsByDeckId, problems };
}
