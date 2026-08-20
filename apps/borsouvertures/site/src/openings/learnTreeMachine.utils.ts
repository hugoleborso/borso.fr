import { Chess } from 'chess.js';
import type { Side } from '@/state/persistedState.utils';
import { isVariationCleared, leafReachedAt, nextMovesAt } from './bookTree.utils';
import type { Variation } from './types';
import { uciFromSquare, uciPromotion, uciToSquare } from './uciSquare.utils';
import { pickRandomCandidate, scheduleTimeoutCallback } from './machineEffects';

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
  'accepted' | 'rejected-out-of-book' | 'rejected-no-variation' | 'rejected-opponents-turn';

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
const PLIES_PER_FULL_MOVE = 2;

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

/**
 * Everything one drill owns. A fresh object per {@link LearnTreeMachine.start},
 * so the object's identity doubles as the run's identity: a pending opponent
 * timeout captures the run it was scheduled for and bails when the machine has
 * moved on. That is the mitigation for B5 in the spec (a stale setTimeout
 * firing after a side / variation change), and it also makes "the machine has
 * been started" a single fact rather than one nullable field per value.
 */
interface LearnTreeRun {
  variation: Variation;
  side: Side;
  chess: Chess;
  playedMovesUci: string[];
  visitedLeafIds: Set<string>;
  isOutOfBookOpen: boolean;
  isShowRevealedArrows: boolean;
}

function beginRun(variation: Variation, side: Side): LearnTreeRun {
  return {
    variation,
    side,
    chess: new Chess(),
    playedMovesUci: [],
    visitedLeafIds: new Set(),
    isOutOfBookOpen: false,
    isShowRevealedArrows: false,
  };
}

function computeSnapshot(run: LearnTreeRun): LearnTreeSnapshot {
  return {
    variationId: run.variation.id,
    side: run.side,
    fen: run.chess.fen(),
    playedMovesUci: [...run.playedMovesUci],
    nextBookMovesUci: nextMovesAt(run.variation, run.playedMovesUci),
    visitedLeafIds: new Set(run.visitedLeafIds),
    variationCleared: isVariationCleared(run.variation, run.visitedLeafIds),
    outOfBookOpen: run.isOutOfBookOpen,
    showRevealedArrows: run.isShowRevealedArrows,
  };
}

function applyUciToBoard(run: LearnTreeRun, uci: string): void {
  run.chess.move({
    from: uciFromSquare(uci),
    to: uciToSquare(uci),
    promotion: uciPromotion(uci),
  });
}

function isOpponentToMove(run: LearnTreeRun): boolean {
  const ply = run.playedMovesUci.length;
  return (
    (run.side === 'white' && ply % PLIES_PER_FULL_MOVE === 1) ||
    (run.side === 'black' && ply % PLIES_PER_FULL_MOVE === 0)
  );
}

function recordVisitedLeafIfReached(run: LearnTreeRun): void {
  const leaf = leafReachedAt(run.variation, run.playedMovesUci);
  if (!leaf) return;
  run.visitedLeafIds.add(leaf.id);
}

/**
 * Creates a Learn-tree state machine instance. The machine owns one
 * {@link Chess} engine, the played-move history, and the visited-leaves set,
 * all held in the {@link LearnTreeRun} the current drill created. Components
 * subscribe via `useSyncExternalStore`; tests drive it directly with injected
 * timers + RNG.
 */
// @FollowsBlueprint state-machine-module
export function createLearnTreeMachine(options: LearnTreeMachineOptions = {}): LearnTreeMachine {
  const opponentDelayMs = options.opponentDelayMs ?? DEFAULT_OPPONENT_DELAY_MS;
  const pickRandom = options.pickRandom ?? pickRandomCandidate;
  const scheduleTimeout = options.scheduleTimeout ?? scheduleTimeoutCallback;

  let run: LearnTreeRun | null = null;
  let snapshot: LearnTreeSnapshot = INITIAL_SNAPSHOT;

  const listeners = new Set<() => void>();

  function notify(currentRun: LearnTreeRun): void {
    snapshot = computeSnapshot(currentRun);
    for (const listener of listeners) listener();
  }

  function scheduleOpponentMove(currentRun: LearnTreeRun): void {
    if (!isOpponentToMove(currentRun)) return;
    // No candidate at this ply — don't enqueue a no-op timer that would sit
    // stale in the queue across a reset and dequeue ahead of the next real
    // opponent move when fired.
    if (nextMovesAt(currentRun.variation, currentRun.playedMovesUci).length === 0) return;
    scheduleTimeout(() => {
      // Stale callback after a reset / start that began a different run.
      if (currentRun !== run) return;
      const candidates = nextMovesAt(currentRun.variation, currentRun.playedMovesUci);
      const choice = pickRandom(candidates);
      // Empty candidates → pickRandomCandidate returns `candidates[0]`, which is
      // `undefined` per `noUncheckedIndexedAccess`. Tests can also inject a
      // picker that returns `undefined` to assert this path.
      if (!choice) return;
      applyUciToBoard(currentRun, choice);
      currentRun.playedMovesUci.push(choice);
      recordVisitedLeafIfReached(currentRun);
      notify(currentRun);
    }, opponentDelayMs);
  }

  function start(nextVariation: Variation, nextSide: Side): void {
    const nextRun = beginRun(nextVariation, nextSide);
    run = nextRun;
    notify(nextRun);
    scheduleOpponentMove(nextRun);
  }

  function reset(): void {
    const currentRun = run;
    if (!currentRun) return;
    start(currentRun.variation, currentRun.side);
  }

  function playMove(uci: string): PlayMoveResult {
    const currentRun = run;
    if (!currentRun) return 'rejected-no-variation';
    if (isOpponentToMove(currentRun)) return 'rejected-opponents-turn';
    const candidates = nextMovesAt(currentRun.variation, currentRun.playedMovesUci);
    if (!candidates.includes(uci)) {
      currentRun.isOutOfBookOpen = true;
      notify(currentRun);
      return 'rejected-out-of-book';
    }
    applyUciToBoard(currentRun, uci);
    currentRun.playedMovesUci.push(uci);
    recordVisitedLeafIfReached(currentRun);
    currentRun.isShowRevealedArrows = false;
    notify(currentRun);
    // A cleared variation has no line left to follow, so the candidate guard in
    // scheduleOpponentMove already declines; the call is made unconditionally.
    scheduleOpponentMove(currentRun);
    return 'accepted';
  }

  function dismissOutOfBook(): void {
    const currentRun = run;
    if (!currentRun?.isOutOfBookOpen) return;
    currentRun.isOutOfBookOpen = false;
    notify(currentRun);
  }

  function revealArrows(): void {
    const currentRun = run;
    if (!currentRun) return;
    if (currentRun.isShowRevealedArrows) return;
    currentRun.isShowRevealedArrows = true;
    notify(currentRun);
  }

  function hideArrows(): void {
    const currentRun = run;
    if (!currentRun?.isShowRevealedArrows) return;
    currentRun.isShowRevealedArrows = false;
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
    dismissOutOfBook,
    revealArrows,
    hideArrows,
  };
}
