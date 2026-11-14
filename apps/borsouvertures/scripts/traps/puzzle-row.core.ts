import { type DeckSide, parseDeckSource } from '../decks/deck-source.core';
import type { TrapFilters, TrapsDocument, TrapSource } from './trap-cards.core';

export interface PuzzleRow {
  puzzleId: string;
  fen: string;
  movesUci: string[];
  rating: number;
  popularity: number;
  plays: number;
  openingTags: string[];
  readerSide: DeckSide;
  fullMoveNumber: number;
}

export interface TrapDeckFilter {
  deckId: string;
  side: DeckSide;
  openingTags: string[];
}

export interface TrapCandidate {
  trap: TrapSource;
  plays: number;
}

export const TRAP_LIMITS = {
  minimumRating: 1000,
  maximumRating: 1700,
  minimumPopularity: 80,
  maximumFullMoveNumber: 15,
  trapsPerDeck: 10,
} as const;

const COLUMN_SEPARATOR = ',';
const WORD_SEPARATOR = ' ';
const PUZZLE_ID_COLUMN = 0;
const FEN_COLUMN = 1;
const MOVES_COLUMN = 2;
const RATING_COLUMN = 3;
const POPULARITY_COLUMN = 5;
const PLAYS_COLUMN = 6;
const OPENING_TAGS_COLUMN = 9;
const FEN_FIELD_COUNT = 6;
const TURN_FIELD = 1;
const READER_SIDE_BY_FIRST_MOVER = new Map<string, DeckSide>([
  ['w', 'black'],
  ['b', 'white'],
]);

function splitWords(text: string): string[] {
  return text.split(WORD_SEPARATOR).filter((word) => word.length > 0);
}

// @FollowsBlueprint core-parse-untrusted
export function parsePuzzleRow(line: string): PuzzleRow | null {
  const columns = line.split(COLUMN_SEPARATOR);
  if (columns.length <= OPENING_TAGS_COLUMN) return null;
  const readColumn = (index: number): string => String(columns[index]);
  const fen = readColumn(FEN_COLUMN);
  const fenFields = splitWords(fen);
  const readerSide = READER_SIDE_BY_FIRST_MOVER.get(String(fenFields[TURN_FIELD]));
  const fullMoveNumber = Number(fenFields[FEN_FIELD_COUNT - 1]);
  const rating = Number(readColumn(RATING_COLUMN));
  const popularity = Number(readColumn(POPULARITY_COLUMN));
  const plays = Number(readColumn(PLAYS_COLUMN));
  const isEveryNumberRead = [fullMoveNumber, rating, popularity, plays].every((count) =>
    Number.isInteger(count),
  );
  if (fenFields.length !== FEN_FIELD_COUNT || readerSide === undefined || !isEveryNumberRead) {
    return null;
  }
  return {
    puzzleId: readColumn(PUZZLE_ID_COLUMN),
    fen,
    movesUci: splitWords(readColumn(MOVES_COLUMN)),
    rating,
    popularity,
    plays,
    openingTags: splitWords(readColumn(OPENING_TAGS_COLUMN)),
    readerSide,
    fullMoveNumber,
  };
}

export function isTrapOfDeck(row: PuzzleRow, filter: TrapDeckFilter): boolean {
  return (
    row.readerSide === filter.side &&
    row.rating >= TRAP_LIMITS.minimumRating &&
    row.rating <= TRAP_LIMITS.maximumRating &&
    row.popularity >= TRAP_LIMITS.minimumPopularity &&
    row.fullMoveNumber <= TRAP_LIMITS.maximumFullMoveNumber &&
    row.openingTags.some((tag) => filter.openingTags.includes(tag))
  );
}

export function listTrapDeckFilters(deckSources: readonly unknown[]): TrapDeckFilter[] {
  return deckSources
    .map((deckSource) => parseDeckSource(deckSource))
    .flatMap((parse) => (parse.ok ? [parse.deck] : []))
    .toSorted((left, right) => left.order - right.order)
    .flatMap((deck) =>
      deck.trapFilter === undefined
        ? []
        : [{ deckId: deck.id, side: deck.side, openingTags: deck.trapFilter.openingTags }],
    );
}

export function listTrapCandidates(
  line: string,
  filters: readonly TrapDeckFilter[],
): TrapCandidate[] {
  const row = parsePuzzleRow(line);
  if (row === null) return [];
  const filter = filters.find((deck) => isTrapOfDeck(row, deck));
  if (filter === undefined) return [];
  const { puzzleId, fen, movesUci, rating, plays } = row;
  return [{ trap: { puzzleId, deckId: filter.deckId, fen, movesUci, rating }, plays }];
}

function listMostPlayedTraps(candidates: readonly TrapCandidate[], deckId: string): TrapSource[] {
  return candidates
    .filter((candidate) => candidate.trap.deckId === deckId)
    .toSorted(
      (left, right) =>
        right.plays - left.plays || left.trap.puzzleId.localeCompare(right.trap.puzzleId, 'en'),
    )
    .slice(0, TRAP_LIMITS.trapsPerDeck)
    .map((candidate) => candidate.trap);
}

export function buildTrapsDocument(
  dumpLastModified: string,
  filters: readonly TrapDeckFilter[],
  candidates: readonly TrapCandidate[],
): TrapsDocument {
  const recordedFilters: TrapFilters = {
    ...TRAP_LIMITS,
    openingTagsByDeckId: Object.fromEntries(
      filters.map((filter) => [filter.deckId, filter.openingTags]),
    ),
  };
  return {
    dumpLastModified,
    filters: recordedFilters,
    traps: filters.flatMap((filter) => listMostPlayedTraps(candidates, filter.deckId)),
  };
}

export function formatTrapCounts(document: TrapsDocument): string[] {
  return Object.keys(document.filters.openingTagsByDeckId).map((deckId) => {
    const count = document.traps.filter((trap) => trap.deckId === deckId).length;
    return `[build-traps] ${deckId}: ${count} traps`;
  });
}
