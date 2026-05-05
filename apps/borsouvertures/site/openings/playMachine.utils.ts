import { Chess } from 'chess.js';
import type { Side } from '@/state/persistedState.utils';
import { computeBookState, type PlayScopeFilter } from './bookEngine.utils';
import type { Selection } from './selectors.utils';
import type { Line, Opening, Variation } from './types';
import { uciFromSquare, uciPromotion, uciToSquare } from './uciSquare.utils';

export interface PlayMachineConfig {
  openings: Opening[];
  selection: Selection;
  playScope: PlayScopeFilter;
  side: Side;
  autoOpponent: boolean;
}

interface PlayMachineSnapshot {
  fen: string;
  playedMovesUci: readonly string[];
  inBook: boolean;
  atLineEnd: boolean;
  nextBookMovesUci: readonly string[];
  uniqueOpening: Opening | undefined;
  uniqueVariation: Variation | undefined;
  uniqueLine: Line | undefined;
  candidateCount: number;
  outOfBookOpen: boolean;
  successOpen: boolean;
  manualReveal: boolean;
  side: Side;
  autoOpponent: boolean;
}

type PlayMoveResult = 'accepted' | 'rejected-out-of-book' | 'rejected-opponents-turn';

export interface PlayMachine {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PlayMachineSnapshot;
  start: (config: PlayMachineConfig) => void;
  playMove: (uci: string) => PlayMoveResult;
  reset: () => void;
  undo: () => void;
  revealBookMoves: () => void;
  dismissOutOfBook: () => void;
  dismissSuccess: () => void;
  setAutoOpponent: (value: boolean) => void;
}

export interface PlayMachineOptions {
  opponentDelayMs?: number;
  pickRandom?: (candidates: readonly string[]) => string | undefined;
  scheduleTimeout?: (callback: () => void, delayMs: number) => void;
}

const DEFAULT_OPPONENT_DELAY_MS = 200;

const STARTING_FEN = new Chess().fen();
const EMPTY_MOVES: readonly string[] = [];

const INITIAL_SNAPSHOT: PlayMachineSnapshot = {
  fen: STARTING_FEN,
  playedMovesUci: EMPTY_MOVES,
  inBook: false,
  atLineEnd: false,
  nextBookMovesUci: EMPTY_MOVES,
  uniqueOpening: undefined,
  uniqueVariation: undefined,
  uniqueLine: undefined,
  candidateCount: 0,
  outOfBookOpen: false,
  successOpen: false,
  manualReveal: false,
  side: 'white',
  autoOpponent: true,
};

function defaultPickRandom(candidates: readonly string[]): string | undefined {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function defaultScheduleTimeout(callback: () => void, delayMs: number): void {
  setTimeout(callback, delayMs);
}

/**
 * Play-mode state machine. Owns one chess.js engine + the played-move history
 * + a generation counter for stale-setTimeout protection (spec B5). Components
 * subscribe via `useSyncExternalStore`; tests drive it directly with injected
 * timers + RNG.
 *
 * The machine consults `computeBookState` on every move to decide whether the
 * user is still in book; the book engine is the source of truth for "what
 * moves are legal in this scope." The machine is responsible for chess state
 * and timing — it does not invent book logic.
 */
export function createPlayMachine(options: PlayMachineOptions = {}): PlayMachine {
  const opponentDelayMs = options.opponentDelayMs ?? DEFAULT_OPPONENT_DELAY_MS;
  const pickRandom = options.pickRandom ?? defaultPickRandom;
  const scheduleTimeout = options.scheduleTimeout ?? defaultScheduleTimeout;

  let chess = new Chess();
  let config: PlayMachineConfig | null = null;
  let playedMovesUci: string[] = [];
  let outOfBookOpen = false;
  let successOpen = false;
  let manualReveal = false;
  let generation = 0;
  let snapshot: PlayMachineSnapshot = INITIAL_SNAPSHOT;

  const listeners = new Set<() => void>();

  function notify(currentConfig: PlayMachineConfig): void {
    snapshot = computeSnapshot(currentConfig);
    for (const listener of listeners) listener();
  }

  function computeSnapshot(currentConfig: PlayMachineConfig): PlayMachineSnapshot {
    const bookState = computeBookState(
      currentConfig.openings,
      currentConfig.selection,
      [...playedMovesUci],
      currentConfig.playScope,
    );
    return {
      fen: chess.fen(),
      playedMovesUci: [...playedMovesUci],
      inBook: bookState.inBook,
      atLineEnd: bookState.atLineEnd,
      nextBookMovesUci: bookState.possibleNextMovesUci,
      uniqueOpening: bookState.uniqueOpening,
      uniqueVariation: bookState.uniqueVariation,
      uniqueLine: bookState.uniqueLine,
      candidateCount: bookState.candidates.length,
      outOfBookOpen,
      successOpen,
      manualReveal,
      side: currentConfig.side,
      autoOpponent: currentConfig.autoOpponent,
    };
  }

  function applyUciToBoard(uci: string): boolean {
    try {
      const move = chess.move({
        from: uciFromSquare(uci),
        to: uciToSquare(uci),
        promotion: uciPromotion(uci),
      });
      return move !== null;
    } catch {
      return false;
    }
  }

  function isOpponentToMove(side: Side): boolean {
    const ply = playedMovesUci.length;
    return (side === 'white' && ply % 2 === 1) || (side === 'black' && ply % 2 === 0);
  }

  function scheduleOpponentMove(currentConfig: PlayMachineConfig): void {
    if (!currentConfig.autoOpponent) return;
    if (!isOpponentToMove(currentConfig.side)) return;
    const bookState = computeBookState(
      currentConfig.openings,
      currentConfig.selection,
      [...playedMovesUci],
      currentConfig.playScope,
    );
    if (!bookState.inBook) return;
    const myGeneration = generation;
    scheduleTimeout(() => {
      if (myGeneration !== generation) return;
      const stillFresh = computeBookState(
        currentConfig.openings,
        currentConfig.selection,
        [...playedMovesUci],
        currentConfig.playScope,
      );
      const choice = pickRandom(stillFresh.possibleNextMovesUci);
      if (!choice) return;
      applyUciToBoard(choice);
      playedMovesUci.push(choice);
      const afterOpponent = computeBookState(
        currentConfig.openings,
        currentConfig.selection,
        [...playedMovesUci],
        currentConfig.playScope,
      );
      if (afterOpponent.atLineEnd) successOpen = true;
      notify(currentConfig);
    }, opponentDelayMs);
  }

  function start(nextConfig: PlayMachineConfig): void {
    chess = new Chess();
    config = nextConfig;
    playedMovesUci = [];
    outOfBookOpen = false;
    successOpen = false;
    manualReveal = false;
    generation += 1;
    notify(nextConfig);
    scheduleOpponentMove(nextConfig);
  }

  function reset(): void {
    if (!config) return;
    start(config);
  }

  function playMove(uci: string): PlayMoveResult {
    const currentConfig = config;
    if (!currentConfig) return 'rejected-out-of-book';
    if (isOpponentToMove(currentConfig.side) && currentConfig.autoOpponent) {
      return 'rejected-opponents-turn';
    }
    if (!applyUciToBoard(uci)) return 'rejected-out-of-book';
    playedMovesUci.push(uci);
    const bookState = computeBookState(
      currentConfig.openings,
      currentConfig.selection,
      [...playedMovesUci],
      currentConfig.playScope,
    );
    if (!bookState.inBook) {
      chess.undo();
      playedMovesUci.pop();
      outOfBookOpen = true;
      notify(currentConfig);
      return 'rejected-out-of-book';
    }
    manualReveal = false;
    if (bookState.atLineEnd) successOpen = true;
    notify(currentConfig);
    if (!bookState.atLineEnd) scheduleOpponentMove(currentConfig);
    return 'accepted';
  }

  function undo(): void {
    const currentConfig = config;
    if (!currentConfig) return;
    const pliesToUndo = currentConfig.autoOpponent ? 2 : 1;
    if (playedMovesUci.length < pliesToUndo) return;
    for (let i = 0; i < pliesToUndo; i += 1) chess.undo();
    playedMovesUci = playedMovesUci.slice(0, -pliesToUndo);
    outOfBookOpen = false;
    successOpen = false;
    manualReveal = false;
    notify(currentConfig);
  }

  function revealBookMoves(): void {
    const currentConfig = config;
    if (!currentConfig) return;
    if (manualReveal) return;
    manualReveal = true;
    outOfBookOpen = false;
    notify(currentConfig);
  }

  function dismissOutOfBook(): void {
    const currentConfig = config;
    if (!currentConfig) return;
    if (!outOfBookOpen) return;
    outOfBookOpen = false;
    notify(currentConfig);
  }

  function dismissSuccess(): void {
    const currentConfig = config;
    if (!currentConfig) return;
    if (!successOpen) return;
    successOpen = false;
    notify(currentConfig);
  }

  function setAutoOpponent(value: boolean): void {
    const currentConfig = config;
    if (!currentConfig) return;
    if (currentConfig.autoOpponent === value) return;
    config = { ...currentConfig, autoOpponent: value };
    notify(config);
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
    reset,
    undo,
    revealBookMoves,
    dismissOutOfBook,
    dismissSuccess,
    setAutoOpponent,
  };
}
