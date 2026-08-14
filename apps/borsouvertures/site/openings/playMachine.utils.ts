import { Chess } from 'chess.js';
import type { Side } from '@/state/persistedState.utils';
import { type BookState, computeBookState, type PlayScopeFilter } from './bookEngine.utils';
import type { Selection } from './selectors.utils';
import type { Line, Opening, Variation } from './types';
import { uciFromSquare, uciPromotion, uciToSquare } from './uciSquare.utils';
import { pickRandomCandidate, scheduleTimeoutCallback } from './machineEffects';

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
  setAutoOpponent: (isEnabled: boolean) => void;
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

/**
 * Everything one game owns: the configuration it was started with, the chess
 * engine, the played-move history, and the three modal flags. A fresh object
 * per {@link PlayMachine.start}, so the object's identity doubles as the
 * game's identity — a pending opponent timeout captures the run it belongs to
 * and bails once the machine has moved on, which is the mitigation for B5 in
 * the spec (a stale setTimeout firing after a reset).
 */
interface PlayRun {
  config: PlayMachineConfig;
  chess: Chess;
  playedMovesUci: string[];
  isOutOfBookOpen: boolean;
  isSuccessOpen: boolean;
  isManualReveal: boolean;
}

function beginRun(config: PlayMachineConfig): PlayRun {
  return {
    config,
    chess: new Chess(),
    playedMovesUci: [],
    isOutOfBookOpen: false,
    isSuccessOpen: false,
    isManualReveal: false,
  };
}

function readBookState(run: PlayRun): BookState {
  return computeBookState(
    run.config.openings,
    run.config.selection,
    [...run.playedMovesUci],
    run.config.playScope,
  );
}

function computeSnapshot(run: PlayRun): PlayMachineSnapshot {
  const bookState = readBookState(run);
  return {
    fen: run.chess.fen(),
    playedMovesUci: [...run.playedMovesUci],
    inBook: bookState.inBook,
    atLineEnd: bookState.atLineEnd,
    nextBookMovesUci: bookState.possibleNextMovesUci,
    uniqueOpening: bookState.uniqueOpening,
    uniqueVariation: bookState.uniqueVariation,
    uniqueLine: bookState.uniqueLine,
    candidateCount: bookState.candidates.length,
    outOfBookOpen: run.isOutOfBookOpen,
    successOpen: run.isSuccessOpen,
    manualReveal: run.isManualReveal,
    side: run.config.side,
    autoOpponent: run.config.autoOpponent,
  };
}

function didApplyUciToBoard(run: PlayRun, uci: string): boolean {
  try {
    run.chess.move({
      from: uciFromSquare(uci),
      to: uciToSquare(uci),
      promotion: uciPromotion(uci),
    });
  } catch {
    return false;
  }
  return true;
}

function isOpponentToMove(run: PlayRun): boolean {
  const ply = run.playedMovesUci.length;
  return (
    (run.config.side === 'white' && ply % 2 === 1) || (run.config.side === 'black' && ply % 2 === 0)
  );
}

/**
 * Play-mode state machine. Owns one chess.js engine plus the played-move
 * history, both held in the {@link PlayRun} the current game created.
 * Components subscribe via `useSyncExternalStore`; tests drive it directly
 * with injected timers + RNG.
 *
 * The machine consults `computeBookState` on every move to decide whether the
 * user is still in book; the book engine is the source of truth for "what
 * moves are legal in this scope." The machine is responsible for chess state
 * and timing — it does not invent book logic.
 *
 * @Blueprint state-machine-module
 * @BlueprintName Hand Written State Machine Module
 * @BlueprintUsage Use for session state that outlives a render, has timers of its own, and would otherwise be a tangle of `useState` and effects.
 * @BlueprintDescription Returns a closure holding the current run, the last snapshot and a listener set, and exposes `subscribe` and `getSnapshot` so a component can read it with `useSyncExternalStore`. Every command mutates the run then calls `notify`, which recomputes the snapshot once and replaces it, so subscribers compare by identity. Each `start` builds a fresh run object and that object's identity is the run's identity, so a timer scheduled for an earlier run compares `activeRun !== scheduledRun` and returns: a stale reply cannot land on the board after a reset. The impure edges arrive as options with production defaults, which is what makes the whole module drivable from a test with no clock.
 */
export function createPlayMachine(options: PlayMachineOptions = {}): PlayMachine {
  const opponentDelayMs = options.opponentDelayMs ?? DEFAULT_OPPONENT_DELAY_MS;
  const pickRandom = options.pickRandom ?? pickRandomCandidate;
  const scheduleTimeout = options.scheduleTimeout ?? scheduleTimeoutCallback;

  let run: PlayRun | null = null;
  let snapshot: PlayMachineSnapshot = INITIAL_SNAPSHOT;

  const listeners = new Set<() => void>();

  function notify(currentRun: PlayRun): void {
    snapshot = computeSnapshot(currentRun);
    for (const listener of listeners) listener();
  }

  function scheduleOpponentMove(scheduledRun: PlayRun): void {
    if (!scheduledRun.config.autoOpponent) return;
    if (!isOpponentToMove(scheduledRun)) return;
    if (!readBookState(scheduledRun).inBook) return;
    scheduleTimeout(() => {
      const activeRun = run;
      // The machine has moved on: a start or a reset replaced the run this
      // reply was scheduled for.
      if (activeRun !== scheduledRun) return;
      const choice = pickRandom(readBookState(activeRun).possibleNextMovesUci);
      if (!choice) return;
      didApplyUciToBoard(activeRun, choice);
      activeRun.playedMovesUci.push(choice);
      if (readBookState(activeRun).atLineEnd) activeRun.isSuccessOpen = true;
      notify(activeRun);
    }, opponentDelayMs);
  }

  function start(nextConfig: PlayMachineConfig): void {
    const nextRun = beginRun(nextConfig);
    run = nextRun;
    notify(nextRun);
    scheduleOpponentMove(nextRun);
  }

  function reset(): void {
    const currentRun = run;
    if (!currentRun) return;
    start(currentRun.config);
  }

  function playMove(uci: string): PlayMoveResult {
    const currentRun = run;
    if (!currentRun) return 'rejected-out-of-book';
    if (isOpponentToMove(currentRun) && currentRun.config.autoOpponent) {
      return 'rejected-opponents-turn';
    }
    if (!didApplyUciToBoard(currentRun, uci)) return 'rejected-out-of-book';
    currentRun.playedMovesUci.push(uci);
    const bookState = readBookState(currentRun);
    if (!bookState.inBook) {
      currentRun.chess.undo();
      currentRun.playedMovesUci.pop();
      currentRun.isOutOfBookOpen = true;
      notify(currentRun);
      return 'rejected-out-of-book';
    }
    currentRun.isManualReveal = false;
    if (bookState.atLineEnd) currentRun.isSuccessOpen = true;
    notify(currentRun);
    if (!bookState.atLineEnd) scheduleOpponentMove(currentRun);
    return 'accepted';
  }

  function undo(): void {
    const currentRun = run;
    if (!currentRun) return;
    const pliesToUndo = currentRun.config.autoOpponent ? 2 : 1;
    if (currentRun.playedMovesUci.length < pliesToUndo) return;
    for (let undone = 0; undone < pliesToUndo; undone += 1) currentRun.chess.undo();
    currentRun.playedMovesUci = currentRun.playedMovesUci.slice(0, -pliesToUndo);
    currentRun.isOutOfBookOpen = false;
    currentRun.isSuccessOpen = false;
    currentRun.isManualReveal = false;
    notify(currentRun);
  }

  function revealBookMoves(): void {
    const currentRun = run;
    if (!currentRun) return;
    if (currentRun.isManualReveal) return;
    currentRun.isManualReveal = true;
    currentRun.isOutOfBookOpen = false;
    notify(currentRun);
  }

  function dismissOutOfBook(): void {
    const currentRun = run;
    if (!currentRun?.isOutOfBookOpen) return;
    currentRun.isOutOfBookOpen = false;
    notify(currentRun);
  }

  function dismissSuccess(): void {
    const currentRun = run;
    if (!currentRun?.isSuccessOpen) return;
    currentRun.isSuccessOpen = false;
    notify(currentRun);
  }

  function setAutoOpponent(isEnabled: boolean): void {
    const currentRun = run;
    if (!currentRun) return;
    if (currentRun.config.autoOpponent === isEnabled) return;
    currentRun.config = { ...currentRun.config, autoOpponent: isEnabled };
    notify(currentRun);
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
