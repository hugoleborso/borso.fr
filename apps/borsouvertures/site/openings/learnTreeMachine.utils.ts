import { Chess } from 'chess.js';
import type { Side } from '@/state/persistedState.utils';
import {
  isVariationCleared,
  leafReachedAt,
  nextMovesAt,
} from './bookTree.utils';
import type { Variation } from './types';
import { uciFromSquare, uciPromotion, uciToSquare } from './uciSquare.utils';

interface LearnTreeSnapshot {
  variationId: string | null;
  side: Side;
  fen: string;
  playedMovesUci: readonly string[];
  nextBookMovesUci: readonly string[];
  visitedLeafIds: ReadonlySet<string>;
  variationCleared: boolean;
  outOfBookOpen: boolean;
  showRevealedArrows: boolean;
}

type PlayMoveResult =
  | 'accepted'
  | 'rejected-out-of-book'
  | 'rejected-no-variation'
  | 'rejected-opponents-turn';

export interface LearnTreeMachine {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => LearnTreeSnapshot;
  start: (variation: Variation, side: Side) => void;
  playMove: (uci: string) => PlayMoveResult;
  reset: () => void;
  dismissOutOfBook: () => void;
  revealArrows: () => void;
  hideArrows: () => void;
}

export interface LearnTreeMachineOptions {
  /** Delay before the opponent's automated reply. Default {@link DEFAULT_OPPONENT_DELAY_MS}. */
  opponentDelayMs?: number;
  /** Pick a random move from the candidates. Tests inject a deterministic picker. */
  pickRandom?: (candidates: readonly string[]) => string | undefined;
  /**
   * Schedules a callback after `delayMs`. Tests inject a fake-timer-friendly
   * implementation; production uses the global setTimeout.
   */
  scheduleTimeout?: (callback: () => void, delayMs: number) => void;
}

const DEFAULT_OPPONENT_DELAY_MS = 250;

const STARTING_FEN = new Chess().fen();
const EMPTY_VISITED: ReadonlySet<string> = new Set();
const EMPTY_MOVES: readonly string[] = [];

const INITIAL_SNAPSHOT: LearnTreeSnapshot = {
  variationId: null,
  side: 'white',
  fen: STARTING_FEN,
  playedMovesUci: EMPTY_MOVES,
  nextBookMovesUci: EMPTY_MOVES,
  visitedLeafIds: EMPTY_VISITED,
  variationCleared: false,
  outOfBookOpen: false,
  showRevealedArrows: false,
};

function defaultPickRandom(candidates: readonly string[]): string | undefined {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function defaultScheduleTimeout(callback: () => void, delayMs: number): void {
  setTimeout(callback, delayMs);
}

/**
 * Creates a Learn-tree state machine instance. The machine owns one
 * {@link Chess} engine, the played-move history, and the visited-leaves set.
 * Components subscribe via `useSyncExternalStore`; tests drive it directly
 * with injected timers + RNG.
 *
 * The internal generation counter increments on every {@link start} /
 * {@link reset}; pending opponent timeouts capture the generation at schedule
 * time and bail when the machine has moved on. This is the mitigation for B5
 * in the spec (stale setTimeout firing after a side / variation change).
 */
export function createLearnTreeMachine(
  options: LearnTreeMachineOptions = {},
): LearnTreeMachine {
  const opponentDelayMs = options.opponentDelayMs ?? DEFAULT_OPPONENT_DELAY_MS;
  const pickRandom = options.pickRandom ?? defaultPickRandom;
  const scheduleTimeout = options.scheduleTimeout ?? defaultScheduleTimeout;

  let chess = new Chess();
  let variation: Variation | null = null;
  let side: Side = 'white';
  let playedMovesUci: string[] = [];
  let visitedLeafIds: ReadonlySet<string> = EMPTY_VISITED;
  let outOfBookOpen = false;
  let showRevealedArrows = false;
  let generation = 0;
  let snapshot: LearnTreeSnapshot = INITIAL_SNAPSHOT;

  const listeners = new Set<() => void>();

  function notify(currentVariation: Variation): void {
    snapshot = computeSnapshot(currentVariation);
    for (const listener of listeners) listener();
  }

  function computeSnapshot(currentVariation: Variation): LearnTreeSnapshot {
    return {
      variationId: currentVariation.id,
      side,
      fen: chess.fen(),
      playedMovesUci: [...playedMovesUci],
      nextBookMovesUci: nextMovesAt(currentVariation, playedMovesUci),
      visitedLeafIds,
      variationCleared: isVariationCleared(currentVariation, visitedLeafIds),
      outOfBookOpen,
      showRevealedArrows,
    };
  }

  function applyUciToBoard(uci: string): void {
    chess.move({
      from: uciFromSquare(uci),
      to: uciToSquare(uci),
      promotion: uciPromotion(uci),
    });
  }

  function isOpponentToMove(): boolean {
    const ply = playedMovesUci.length;
    return (side === 'white' && ply % 2 === 1) || (side === 'black' && ply % 2 === 0);
  }

  function recordVisitedLeafIfReached(currentVariation: Variation): void {
    const leaf = leafReachedAt(currentVariation, playedMovesUci);
    if (!leaf) return;
    const nextSet = new Set(visitedLeafIds);
    nextSet.add(leaf.id);
    visitedLeafIds = nextSet;
  }

  function scheduleOpponentMove(currentVariation: Variation): void {
    if (!isOpponentToMove()) return;
    // No candidate at this ply — don't enqueue a no-op timer that would sit
    // stale in the queue across a reset and dequeue ahead of the next real
    // opponent move when fired.
    if (nextMovesAt(currentVariation, playedMovesUci).length === 0) return;
    const myGeneration = generation;
    scheduleTimeout(() => {
      // Stale callback after a reset / start that bumped the generation.
      if (myGeneration !== generation) return;
      const candidates = nextMovesAt(currentVariation, playedMovesUci);
      const choice = pickRandom(candidates);
      // Empty candidates → defaultPickRandom returns `candidates[0]`, which is
      // `undefined` per `noUncheckedIndexedAccess`. Tests can also inject a
      // picker that returns `undefined` to assert this path.
      if (!choice) return;
      applyUciToBoard(choice);
      playedMovesUci.push(choice);
      recordVisitedLeafIfReached(currentVariation);
      notify(currentVariation);
    }, opponentDelayMs);
  }

  function start(nextVariation: Variation, nextSide: Side): void {
    chess = new Chess();
    variation = nextVariation;
    side = nextSide;
    playedMovesUci = [];
    visitedLeafIds = EMPTY_VISITED;
    outOfBookOpen = false;
    showRevealedArrows = false;
    generation += 1;
    notify(nextVariation);
    scheduleOpponentMove(nextVariation);
  }

  function reset(): void {
    const currentVariation = variation;
    if (!currentVariation) return;
    start(currentVariation, side);
  }

  function playMove(uci: string): PlayMoveResult {
    const currentVariation = variation;
    if (!currentVariation) return 'rejected-no-variation';
    if (isOpponentToMove()) return 'rejected-opponents-turn';
    const candidates = nextMovesAt(currentVariation, playedMovesUci);
    if (!candidates.includes(uci)) {
      outOfBookOpen = true;
      notify(currentVariation);
      return 'rejected-out-of-book';
    }
    applyUciToBoard(uci);
    playedMovesUci.push(uci);
    recordVisitedLeafIfReached(currentVariation);
    showRevealedArrows = false;
    notify(currentVariation);
    if (!isVariationCleared(currentVariation, visitedLeafIds)) {
      scheduleOpponentMove(currentVariation);
    }
    return 'accepted';
  }

  function dismissOutOfBook(): void {
    const currentVariation = variation;
    if (!currentVariation) return;
    if (!outOfBookOpen) return;
    outOfBookOpen = false;
    notify(currentVariation);
  }

  function revealArrows(): void {
    const currentVariation = variation;
    if (!currentVariation) return;
    if (showRevealedArrows) return;
    showRevealedArrows = true;
    notify(currentVariation);
  }

  function hideArrows(): void {
    const currentVariation = variation;
    if (!currentVariation) return;
    if (showRevealedArrows === false) return;
    showRevealedArrows = false;
    notify(currentVariation);
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
    dismissOutOfBook,
    revealArrows,
    hideArrows,
  };
}
