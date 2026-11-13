import { deriveCalendarDay } from '@domain/calendar-day.core';
import type { ReviewEvent, ReviewOutcome } from '@domain/review-event.core';
import { isExpectedMove, type ReviewCard, type ReviewStep } from '@/decks/card.core';
import type { ProductEvent } from '@/observability/error-reporting.core';

export type ReviewPhase = 'idle' | 'asking' | 'answered' | 'completed';
export type ReviewStatus = 'opponent-moving' | 'your-move' | 'recalled' | 'missed';
export type PlayMoveResult = 'recalled' | 'continued' | 'missed' | 'ignored';
export type ChooseNameResult = 'recalled' | 'missed' | 'ignored';

export interface ReviewSnapshot {
  phase: ReviewPhase;
  current: ReviewCard | null;
  fen: string;
  isOpponentMovePending: boolean;
  outcome: ReviewOutcome | null;
  cardCount: number;
  answeredCount: number;
  recalledCount: number;
}

export interface ReviewSessionStart {
  cards: readonly ReviewCard[];
  newCardCount: number;
}

export interface ReviewMachineOptions {
  readNow: () => Date;
  readUtcOffsetMinutes: () => number;
  readDeviceId: () => string;
  buildEventId: () => string;
  storeReviewEvent: (event: ReviewEvent) => void;
  recordProductEvent: (event: ProductEvent) => void;
  scheduleTimeout: (callback: () => void, delayMilliseconds: number) => void;
  opponentMoveDelayMilliseconds?: number;
}

export interface ReviewMachine {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ReviewSnapshot;
  start: (session: ReviewSessionStart) => void;
  playMove: (uci: string) => PlayMoveResult;
  chooseName: (openingName: string) => ChooseNameResult;
  showMove: () => void;
  advance: () => void;
}

const DEFAULT_OPPONENT_MOVE_DELAY_MILLISECONDS = 450;
const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

const INITIAL_SNAPSHOT: ReviewSnapshot = {
  phase: 'idle',
  current: null,
  fen: EMPTY_BOARD_FEN,
  isOpponentMovePending: false,
  outcome: null,
  cardCount: 0,
  answeredCount: 0,
  recalledCount: 0,
};

interface ReviewRun {
  queue: ReviewCard[];
  answeredCardIds: Set<string>;
}

const NO_RUN: ReviewRun = { queue: [], answeredCardIds: new Set() };

function readAskedCard(snapshot: ReviewSnapshot): ReviewCard | null {
  return snapshot.phase === 'asking' ? snapshot.current : null;
}

// @FollowsBlueprint state-machine-module
export function createReviewMachine(options: ReviewMachineOptions): ReviewMachine {
  const opponentMoveDelay =
    options.opponentMoveDelayMilliseconds ?? DEFAULT_OPPONENT_MOVE_DELAY_MILLISECONDS;
  let run: ReviewRun = NO_RUN;
  let stepIndex = 0;
  let snapshot: ReviewSnapshot = INITIAL_SNAPSHOT;
  const listeners = new Set<() => void>();

  function publish(change: Partial<ReviewSnapshot>): void {
    snapshot = { ...snapshot, ...change };
    for (const listener of listeners) listener();
  }

  function complete(): void {
    options.recordProductEvent({ name: 'review_session_completed' });
    publish({ phase: 'completed', current: null, isOpponentMovePending: false });
  }

  function askNextCard(currentRun: ReviewRun): void {
    const next = currentRun.queue.shift();
    if (next === undefined) {
      complete();
      return;
    }
    const { opponentMove } = next;
    stepIndex = 0;
    publish({
      phase: 'asking',
      current: next,
      outcome: null,
      fen: opponentMove?.fenBefore ?? next.card.fen,
      isOpponentMovePending: opponentMove !== null,
    });
    if (opponentMove === null) return;
    options.scheduleTimeout(() => {
      const isStillWaiting =
        currentRun === run && snapshot.current === next && snapshot.isOpponentMovePending;
      if (!isStillWaiting) return;
      publish({ fen: next.steps[0]?.fen ?? next.card.fen, isOpponentMovePending: false });
    }, opponentMoveDelay);
  }

  function storeFirstAnswer(
    currentRun: ReviewRun,
    asked: ReviewCard,
    outcome: ReviewOutcome,
  ): void {
    currentRun.answeredCardIds.add(asked.card.cardId);
    const reviewedAt = options.readNow();
    options.storeReviewEvent({
      id: options.buildEventId(),
      cardId: asked.card.cardId,
      outcome,
      reviewedAt: reviewedAt.toISOString(),
      calendarDay: deriveCalendarDay(reviewedAt, options.readUtcOffsetMinutes()),
      deviceId: options.readDeviceId(),
      receivedAt: null,
    });
    options.recordProductEvent({ name: 'card_reviewed', cardKind: asked.card.kind, outcome });
  }

  function answer(outcome: ReviewOutcome): void {
    const currentRun = run;
    const asked = readAskedCard(snapshot);
    if (asked === null) return;
    const isFirstAnswer = !currentRun.answeredCardIds.has(asked.card.cardId);
    if (isFirstAnswer) storeFirstAnswer(currentRun, asked, outcome);
    if (outcome === 'missed') currentRun.queue.push(asked);
    const firstAnswerCount = Number(isFirstAnswer);
    const firstRecallCount = Number(isFirstAnswer && outcome === 'recalled');
    publish({
      phase: 'answered',
      outcome,
      fen: asked.answerFen,
      isOpponentMovePending: false,
      answeredCount: snapshot.answeredCount + firstAnswerCount,
      recalledCount: snapshot.recalledCount + firstRecallCount,
    });
  }

  function start(session: ReviewSessionStart): void {
    const nextRun: ReviewRun = {
      queue: [...session.cards],
      answeredCardIds: new Set(),
    };
    run = nextRun;
    snapshot = { ...INITIAL_SNAPSHOT, cardCount: session.cards.length };
    options.recordProductEvent({ name: 'review_session_started' });
    if (session.newCardCount > 0) {
      options.recordProductEvent({ name: 'new_cards_introduced', count: session.newCardCount });
    }
    askNextCard(nextRun);
  }

  function playOpponentReply(asked: ReviewCard, step: ReviewStep, nextStep: ReviewStep): void {
    const currentRun = run;
    stepIndex += 1;
    const replyStepIndex = stepIndex;
    publish({ fen: step.answerFen, isOpponentMovePending: true });
    options.scheduleTimeout(() => {
      const isStillWaiting =
        currentRun === run &&
        stepIndex === replyStepIndex &&
        snapshot.current === asked &&
        snapshot.isOpponentMovePending;
      if (!isStillWaiting) return;
      publish({ fen: nextStep.fen, isOpponentMovePending: false });
    }, opponentMoveDelay);
  }

  function playMove(uci: string): PlayMoveResult {
    const asked = readAskedCard(snapshot);
    const step = asked?.steps[stepIndex];
    if (asked === null || step === undefined || snapshot.isOpponentMovePending) return 'ignored';
    if (!isExpectedMove(step.moveUci, uci)) {
      answer('missed');
      return 'missed';
    }
    const nextStep = asked.steps[stepIndex + 1];
    if (nextStep === undefined) {
      answer('recalled');
      return 'recalled';
    }
    playOpponentReply(asked, step, nextStep);
    return 'continued';
  }

  function chooseName(openingName: string): ChooseNameResult {
    const asked = readAskedCard(snapshot);
    if (asked?.card.kind !== 'name') return 'ignored';
    const outcome: ReviewOutcome = openingName === asked.card.openingName ? 'recalled' : 'missed';
    answer(outcome);
    return outcome;
  }

  function showMove(): void {
    answer('missed');
  }

  function advance(): void {
    if (snapshot.phase !== 'answered') return;
    askNextCard(run);
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
    chooseName,
    showMove,
    advance,
  };
}

const PERCENT = 100;

export function selectSessionPosition(snapshot: ReviewSnapshot): number {
  const askedAhead = snapshot.phase === 'asking' ? 1 : 0;
  return Math.max(1, Math.min(snapshot.answeredCount + askedAhead, snapshot.cardCount));
}

export function selectRecalledPercent(snapshot: ReviewSnapshot): number {
  if (snapshot.answeredCount === 0) return 0;
  return Math.round((snapshot.recalledCount / snapshot.answeredCount) * PERCENT);
}

export function isMoveAccepted(result: PlayMoveResult): boolean {
  return result === 'recalled' || result === 'continued';
}

export function selectReviewStatus(snapshot: ReviewSnapshot): ReviewStatus {
  if (snapshot.outcome !== null) return snapshot.outcome;
  return snapshot.isOpponentMovePending ? 'opponent-moving' : 'your-move';
}

export function listAnswerMoves(snapshot: ReviewSnapshot): string[] {
  if (snapshot.phase !== 'answered' || snapshot.current === null) return [];
  return snapshot.current.steps.slice(-1).map((step) => step.moveUci);
}

export function isIdeaShown(snapshot: ReviewSnapshot): boolean {
  return snapshot.phase === 'answered' && snapshot.current?.card.kind === 'move';
}

export interface NameChoice {
  openingName: string;
  isRightName: boolean;
  isLocked: boolean;
}

export function listNameChoices(reviewCard: ReviewCard, status: ReviewStatus): NameChoice[] {
  const { card } = reviewCard;
  if (card.kind !== 'name') return [];
  const isLocked = status === 'recalled' || status === 'missed';
  return card.choices.map((openingName) => ({
    openingName,
    isRightName: isLocked && openingName === card.openingName,
    isLocked,
  }));
}

export function selectOpeningName(reviewCard: ReviewCard): string {
  return reviewCard.card.kind === 'name' ? reviewCard.card.openingName : '';
}
