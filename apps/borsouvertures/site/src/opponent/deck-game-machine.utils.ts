import { Chess, type Move } from 'chess.js';
import { formatMoveNotation } from '@/decks/card.core';
import type { BuiltDeck, BuiltDeckLine } from '@/decks/deck.utils';
import type { ProductEvent } from '@/observability/error-reporting.core';
import type { Side } from '@/state/persistedState.utils';
import { listStrengthCommands, type OpponentStrengthId } from './opponent-strength.core';

export type MoveSource = 'book' | 'stockfish';
export type DeckGamePhase = 'idle' | 'reader-to-move' | 'opponent-moving' | 'ended';
export type DeckGameEnding =
  | 'reader-won'
  | 'opponent-won'
  | 'draw'
  | 'stockfish-unavailable'
  | 'stockfish-illegal-move';
export type DeckGameStatus = 'reader-to-move' | 'book-moving' | 'stockfish-moving' | DeckGameEnding;
export type DeckGameMoveResult = 'accepted' | 'rejected' | 'ignored';

export interface OpponentMoveRecord {
  notation: string;
  source: MoveSource;
}

export interface DeckGameSnapshot {
  phase: DeckGamePhase;
  deckId: string | null;
  readerSide: Side;
  fen: string;
  moveSource: MoveSource;
  lastOpponentMove: OpponentMoveRecord | null;
  missedBookMove: string | null;
  ending: DeckGameEnding | null;
}

export interface StockfishMoveRequest {
  fen: string;
  strengthCommands: readonly string[];
}

export interface DeckGameMachineOptions {
  readStrength: () => OpponentStrengthId;
  warmUpStockfish: () => void;
  findStockfishMove: (request: StockfishMoveRequest) => Promise<string>;
  stopStockfish: () => void;
  pickRandom: (candidates: readonly string[]) => string | undefined;
  scheduleTimeout: (callback: () => void, delayMilliseconds: number) => void;
  recordProductEvent: (event: ProductEvent) => void;
  reportError: (error: unknown) => void;
  bookMoveDelayMilliseconds?: number;
}

export interface DeckGameMachine {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => DeckGameSnapshot;
  start: (deck: BuiltDeck) => void;
  playMove: (uci: string) => DeckGameMoveResult;
  leave: () => void;
}

export class StockfishIllegalMoveError extends Error {
  readonly tags: { strength: OpponentStrengthId };

  constructor(answer: string, fen: string, strength: OpponentStrengthId) {
    super(`Stockfish answered "${answer}", which the board refuses at "${fen}".`);
    this.name = 'StockfishIllegalMoveError';
    this.tags = { strength };
  }
}

const DEFAULT_BOOK_MOVE_DELAY_MILLISECONDS = 450;
const STARTING_FEN = new Chess().fen();
const DEFAULT_PROMOTION = 'q';
const NO_PICK = '';

const INITIAL_SNAPSHOT: DeckGameSnapshot = {
  phase: 'idle',
  deckId: null,
  readerSide: 'white',
  fen: STARTING_FEN,
  moveSource: 'book',
  lastOpponentMove: null,
  missedBookMove: null,
  ending: null,
};

interface DeckGameRun {
  deck: BuiltDeck;
  chess: Chess;
  playedMovesUci: string[];
}

export function listNextBookMoves(
  lines: readonly BuiltDeckLine[],
  playedMovesUci: readonly string[],
): string[] {
  return lines.flatMap((line) => {
    const isPrefix = playedMovesUci.every((uci, plyIndex) => line.movesUci[plyIndex] === uci);
    const nextMove = line.movesUci[playedMovesUci.length];
    return isPrefix && nextMove !== undefined ? [nextMove] : [];
  });
}

function findExactMove(chess: Chess, uci: string): Move | null {
  return chess.moves({ verbose: true }).find((move) => move.lan === uci) ?? null;
}

function findReaderMove(chess: Chess, uci: string): Move | null {
  return findExactMove(chess, uci) ?? findExactMove(chess, `${uci}${DEFAULT_PROMOTION}`);
}

function readSideToMove(chess: Chess): Side {
  return chess.turn() === 'w' ? 'white' : 'black';
}

function selectEnding(chess: Chess, readerSide: Side): DeckGameEnding {
  if (!chess.isCheckmate()) return 'draw';
  return readSideToMove(chess) === readerSide ? 'opponent-won' : 'reader-won';
}

// @FollowsBlueprint state-machine-module
export function createDeckGameMachine(options: DeckGameMachineOptions): DeckGameMachine {
  const bookMoveDelay = options.bookMoveDelayMilliseconds ?? DEFAULT_BOOK_MOVE_DELAY_MILLISECONDS;
  let run: DeckGameRun | null = null;
  let snapshot: DeckGameSnapshot = INITIAL_SNAPSHOT;
  const runsThatLeftDeck = new WeakSet<DeckGameRun>();
  const strengthInUseByRun = new WeakMap<DeckGameRun, OpponentStrengthId>();
  const listeners = new Set<() => void>();

  function publish(change: Partial<DeckGameSnapshot>): void {
    snapshot = { ...snapshot, ...change };
    for (const listener of listeners) listener();
  }

  function end(currentRun: DeckGameRun, ending: DeckGameEnding): void {
    options.stopStockfish();
    publish({ phase: 'ended', ending, fen: currentRun.chess.fen() });
  }

  function leaveDeck(currentRun: DeckGameRun): void {
    if (runsThatLeftDeck.has(currentRun)) return;
    runsThatLeftDeck.add(currentRun);
    options.recordProductEvent({ name: 'opponent_left_deck', deckId: currentRun.deck.id });
  }

  function applyOpponentMove(currentRun: DeckGameRun, move: Move, source: MoveSource): void {
    const notation = formatMoveNotation(currentRun.playedMovesUci.length, move.san);
    currentRun.chess.move(move.san);
    currentRun.playedMovesUci.push(move.lan);
    snapshot = { ...snapshot, lastOpponentMove: { notation, source } };
    advance(currentRun);
  }

  function restartStockfishOnNewStrength(
    currentRun: DeckGameRun,
    strength: OpponentStrengthId,
  ): void {
    const strengthInUse = strengthInUseByRun.get(currentRun);
    const isStrengthChanged = strengthInUse !== undefined && strengthInUse !== strength;
    if (isStrengthChanged) options.stopStockfish();
    strengthInUseByRun.set(currentRun, strength);
  }

  function playStockfishMove(currentRun: DeckGameRun): void {
    const strength = options.readStrength();
    restartStockfishOnNewStrength(currentRun, strength);
    const fen = currentRun.chess.fen();
    publish({ phase: 'opponent-moving', fen, moveSource: 'stockfish' });
    options.findStockfishMove({ fen, strengthCommands: listStrengthCommands(strength) }).then(
      (answer) => {
        if (currentRun !== run) return;
        const move = findExactMove(currentRun.chess, answer);
        if (move === null) {
          options.reportError(new StockfishIllegalMoveError(answer, fen, strength));
          end(currentRun, 'stockfish-illegal-move');
          return;
        }
        applyOpponentMove(currentRun, move, 'stockfish');
      },
      (error: unknown) => {
        if (currentRun !== run) return;
        options.reportError(error);
        end(currentRun, 'stockfish-unavailable');
      },
    );
  }

  function playBookMove(currentRun: DeckGameRun, bookMoves: readonly string[]): void {
    publish({ phase: 'opponent-moving', fen: currentRun.chess.fen(), moveSource: 'book' });
    options.scheduleTimeout(() => {
      if (currentRun !== run) return;
      const move = findExactMove(currentRun.chess, options.pickRandom(bookMoves) ?? NO_PICK);
      if (move === null) {
        leaveDeck(currentRun);
        playStockfishMove(currentRun);
        return;
      }
      applyOpponentMove(currentRun, move, 'book');
    }, bookMoveDelay);
  }

  function advance(currentRun: DeckGameRun): void {
    const { chess, deck } = currentRun;
    if (chess.isGameOver()) {
      end(currentRun, selectEnding(chess, deck.side));
      return;
    }
    const bookMoves = listNextBookMoves(deck.lines, currentRun.playedMovesUci);
    if (bookMoves.length === 0) leaveDeck(currentRun);
    const moveSource: MoveSource = runsThatLeftDeck.has(currentRun) ? 'stockfish' : 'book';
    if (readSideToMove(chess) === deck.side) {
      publish({ phase: 'reader-to-move', fen: chess.fen(), moveSource });
      return;
    }
    if (moveSource === 'book') {
      playBookMove(currentRun, bookMoves);
      return;
    }
    playStockfishMove(currentRun);
  }

  function start(deck: BuiltDeck): void {
    const nextRun: DeckGameRun = {
      deck,
      chess: new Chess(),
      playedMovesUci: [],
    };
    options.stopStockfish();
    run = nextRun;
    snapshot = { ...INITIAL_SNAPSHOT, deckId: deck.id, readerSide: deck.side };
    options.recordProductEvent({ name: 'opponent_game_started', deckId: deck.id });
    options.warmUpStockfish();
    advance(nextRun);
  }

  function findMissedBookMove(currentRun: DeckGameRun, move: Move): string | null {
    const { chess, deck, playedMovesUci } = currentRun;
    const bookMoves = listNextBookMoves(deck.lines, playedMovesUci);
    const [bookMoveUci] = bookMoves;
    if (bookMoveUci === undefined || bookMoves.includes(move.lan)) return null;
    const bookMoveSan = findExactMove(chess, bookMoveUci)?.san ?? bookMoveUci;
    return formatMoveNotation(playedMovesUci.length, bookMoveSan);
  }

  function playMove(uci: string): DeckGameMoveResult {
    const currentRun = run;
    // Stryker disable next-line ConditionalExpression: equivalent mutant, the phase is reader-to-move only while a run is set, because leave clears both and start sets the run before any phase.
    if (currentRun === null || snapshot.phase !== 'reader-to-move') return 'ignored';
    const move = findReaderMove(currentRun.chess, uci);
    if (move === null) return 'rejected';
    const missedBookMove = findMissedBookMove(currentRun, move);
    if (missedBookMove !== null) snapshot = { ...snapshot, missedBookMove };
    currentRun.chess.move(move.san);
    currentRun.playedMovesUci.push(move.lan);
    advance(currentRun);
    return 'accepted';
  }

  function leave(): void {
    run = null;
    options.stopStockfish();
    snapshot = INITIAL_SNAPSHOT;
    for (const listener of listeners) listener();
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    start,
    playMove,
    leave,
  };
}

export function isDeckGameOn(snapshot: DeckGameSnapshot, deckId: string): boolean {
  return snapshot.deckId === deckId;
}

export function isDeckGameMoveAccepted(result: DeckGameMoveResult): boolean {
  return result === 'accepted';
}

export function selectDeckGameStatus(snapshot: DeckGameSnapshot): DeckGameStatus {
  if (snapshot.ending !== null) return snapshot.ending;
  if (snapshot.phase !== 'opponent-moving') return 'reader-to-move';
  return snapshot.moveSource === 'book' ? 'book-moving' : 'stockfish-moving';
}
