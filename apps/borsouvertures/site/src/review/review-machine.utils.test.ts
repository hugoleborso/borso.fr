import { describe, expect, it, vi } from 'vitest';
import { buildReviewCard, listReviewCards, type ReviewCard } from '@/decks/card.core';
import {
  buildExampleDeck,
  buildNameDeck,
  EXAMPLE_NAME_CARD,
  EXAMPLE_TRAP_CARD,
} from '@/decks/deck.test-utils';
import type { MoveCard } from '@/decks/deck.utils';
import { buildReviewDriver } from './review-machine.test-utils';
import {
  createReviewMachine,
  isIdeaShown,
  isMoveAccepted,
  listAnswerMoves,
  listNameChoices,
  selectOpeningName,
  type ReviewSnapshot,
  selectRecalledPercent,
  selectReviewStatus,
  selectSessionPosition,
} from './review-machine.utils';
import { buildEventId, PHONE } from './review.test-utils';

const deck = buildExampleDeck();
const reviewCards = listReviewCards(
  [deck],
  deck.cards.map((card) => card.cardId),
);
const [firstCard, secondCard] = reviewCards;
if (firstCard === undefined || secondCard === undefined) throw new Error('the example has cards');

function readMoveCard(reviewCard: ReviewCard): MoveCard {
  if (reviewCard.card.kind !== 'move') throw new Error('the example holds move cards');
  return reviewCard.card;
}

const WHITE_FIRST_MOVE: ReviewCard = {
  ...firstCard,
  opponentMove: null,
  card: { ...readMoveCard(firstCard), cardId: 'move:vienna-game:start', opponentMoveUci: null },
};

const NAME_CARD = buildReviewCard(buildNameDeck([EXAMPLE_NAME_CARD]), EXAMPLE_NAME_CARD);
const TRAP_CARD = buildReviewCard(deck, EXAMPLE_TRAP_CARD);
const SECOND_TRAP_CARD = buildReviewCard(deck, { ...EXAMPLE_TRAP_CARD, cardId: 'trap:other' });
const [TRAP_FIRST_STEP, TRAP_LAST_STEP] = TRAP_CARD.steps;
if (TRAP_FIRST_STEP === undefined || TRAP_LAST_STEP === undefined) {
  throw new Error('the example trap asks two reader moves');
}

function startSession(cards: readonly ReviewCard[], newCardCount = 0) {
  const driver = buildReviewDriver();
  const machine = createReviewMachine(driver.options);
  machine.start({ cards, newCardCount });
  return { driver, machine };
}

/**
 * @Blueprint test-machine-transition
 * @BlueprintName State Machine Transition Test
 * @BlueprintUsage Use for a hand written machine, to assert each command's effect on the snapshot rather than the calls it made.
 * @BlueprintDescription Builds the machine with the driver's injected timer and picker, then walks it one command at a time and asserts on `getSnapshot()` after each. Timers are fired by hand through `fireNextTimer`, so the opponent's reply lands at a point the test chose and the suite never waits, and the scheduled delay is asserted against the production default because the driver deliberately leaves `opponentDelayMs` unset. Positions are checked against a `Chess` instance built independently from the same moves, so a bug in the machine's own board handling cannot make the assertion agree with it.
 */
describe('the review machine before and at the start', () => {
  it('is idle on an empty board before a session starts, and ignores every command', () => {
    const driver = buildReviewDriver();
    const machine = createReviewMachine(driver.options);
    const idle = machine.getSnapshot();
    expect(idle).toEqual({
      phase: 'idle',
      current: null,
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      isOpponentMovePending: false,
      outcome: null,
      cardCount: 0,
      answeredCount: 0,
      recalledCount: 0,
    });
    expect(machine.playMove('d7d5')).toBe('ignored');
    machine.showMove();
    machine.advance();
    expect(machine.getSnapshot()).toBe(idle);
    expect(driver.storedEvents).toEqual([]);
  });

  it('shows the position before the opponent moved, then replays the move after 450 ms', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    expect(machine.getSnapshot()).toEqual({
      phase: 'asking',
      current: firstCard,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      isOpponentMovePending: true,
      outcome: null,
      cardCount: 2,
      answeredCount: 0,
      recalledCount: 0,
    });
    expect(driver.pendingTimers.map((timer) => timer.delayMilliseconds)).toEqual([450]);
    expect(machine.playMove('d7d5')).toBe('ignored');
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'asking',
      fen: firstCard.card.fen,
      isOpponentMovePending: false,
    });
  });

  it('takes the delay it is given', () => {
    const driver = buildReviewDriver();
    const machine = createReviewMachine({ ...driver.options, opponentMoveDelayMilliseconds: 10 });
    machine.start({ cards: [firstCard], newCardCount: 0 });
    expect(driver.pendingTimers.map((timer) => timer.delayMilliseconds)).toEqual([10]);
  });

  it('asks at once, with no timer, when the reader moves first', () => {
    const { driver, machine } = startSession([WHITE_FIRST_MOVE]);
    expect(driver.pendingTimers).toEqual([]);
    expect(machine.getSnapshot()).toMatchObject({
      fen: WHITE_FIRST_MOVE.card.fen,
      isOpponentMovePending: false,
    });
    expect(machine.playMove('d7d5')).toBe('recalled');
  });

  it('records the start, and the new cards only when there are some', () => {
    expect(startSession([firstCard], 0).driver.productEvents).toEqual([
      { name: 'review_session_started' },
    ]);
    expect(startSession([firstCard], 3).driver.productEvents).toEqual([
      { name: 'review_session_started' },
      { name: 'new_cards_introduced', count: 3 },
    ]);
  });

  it('completes at once when the session holds no card', () => {
    const { driver, machine } = startSession([]);
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'completed',
      current: null,
      cardCount: 0,
    });
    expect(driver.productEvents).toEqual([
      { name: 'review_session_started' },
      { name: 'review_session_completed' },
    ]);
  });
});

describe('answering a card', () => {
  it('recalls a card on the book move, stores one event and shows the position after it', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    driver.fireNextTimer();
    expect(machine.playMove('d7d5')).toBe('recalled');
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'answered',
      current: firstCard,
      outcome: 'recalled',
      fen: firstCard.answerFen,
      isOpponentMovePending: false,
      answeredCount: 1,
      recalledCount: 1,
    });
    expect(driver.storedEvents).toEqual([
      {
        id: buildEventId(1),
        cardId: firstCard.card.cardId,
        outcome: 'recalled',
        reviewedAt: '2026-01-10T22:30:00.000Z',
        calendarDay: '2026-01-10',
        deviceId: PHONE,
        receivedAt: null,
      },
    ]);
    expect(driver.productEvents.at(-1)).toEqual({
      name: 'card_reviewed',
      cardKind: 'move',
      outcome: 'recalled',
    });
  });

  it('stamps the calendar day of the device on the event', () => {
    const { driver, machine } = startSession([firstCard]);
    driver.clock.utcOffsetMinutes = 120;
    driver.fireNextTimer();
    machine.playMove('d7d5');
    expect(driver.storedEvents[0]).toMatchObject({
      reviewedAt: '2026-01-10T22:30:00.000Z',
      calendarDay: '2026-01-11',
    });
  });

  it('misses a card on a move outside the deck and shows the book move', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    driver.fireNextTimer();
    expect(machine.playMove('g8f6')).toBe('missed');
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'answered',
      outcome: 'missed',
      fen: firstCard.answerFen,
      answeredCount: 1,
      recalledCount: 0,
    });
    expect(driver.storedEvents.map((event) => event.outcome)).toEqual(['missed']);
  });

  it('misses a card on Show the move, even while the opponent move is still replaying', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    machine.showMove();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'answered',
      outcome: 'missed',
      fen: firstCard.answerFen,
      isOpponentMovePending: false,
    });
    driver.fireNextTimer();
    expect(machine.getSnapshot().fen).toBe(firstCard.answerFen);
    expect(driver.storedEvents).toHaveLength(1);
  });

  it('ignores a move, a second Show the move and nothing else once the card is answered', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    driver.fireNextTimer();
    machine.playMove('d7d5');
    const answered = machine.getSnapshot();
    expect(machine.playMove('d7d5')).toBe('ignored');
    machine.showMove();
    expect(machine.getSnapshot()).toBe(answered);
    expect(driver.storedEvents).toHaveLength(1);
  });

  it('does not advance before the card is answered', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    driver.fireNextTimer();
    const asking = machine.getSnapshot();
    machine.advance();
    expect(machine.getSnapshot()).toBe(asking);
  });
});

describe('moving through a session', () => {
  it('asks the next card after an answer and completes after the last one', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    driver.fireNextTimer();
    machine.playMove('d7d5');
    machine.advance();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'asking',
      current: secondCard,
      outcome: null,
      fen: secondCard.opponentMove?.fenBefore,
      isOpponentMovePending: true,
      answeredCount: 1,
    });
    driver.fireNextTimer();
    expect(machine.playMove('e7e5')).toBe('recalled');
    machine.advance();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'completed',
      current: null,
      isOpponentMovePending: false,
      answeredCount: 2,
      recalledCount: 2,
      cardCount: 2,
    });
    expect(driver.productEvents.at(-1)).toEqual({ name: 'review_session_completed' });
    expect(
      driver.productEvents.filter((event) => event.name === 'review_session_completed'),
    ).toHaveLength(1);
    expect(driver.storedEvents.map((event) => event.id)).toEqual([
      buildEventId(1),
      buildEventId(2),
    ]);
  });

  it('brings a missed card back at the end, and its second answer stores no event', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    driver.fireNextTimer();
    machine.showMove();
    machine.advance();
    driver.fireNextTimer();
    machine.playMove('e7e5');
    machine.advance();
    expect(machine.getSnapshot()).toMatchObject({ phase: 'asking', current: firstCard });
    driver.fireNextTimer();
    expect(machine.playMove('d7d5')).toBe('recalled');
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'answered',
      outcome: 'recalled',
      answeredCount: 2,
      recalledCount: 1,
    });
    expect(driver.storedEvents.map((event) => [event.cardId, event.outcome])).toEqual([
      [firstCard.card.cardId, 'missed'],
      [secondCard.card.cardId, 'recalled'],
    ]);
    expect(driver.productEvents.filter((event) => event.name === 'card_reviewed')).toHaveLength(2);
    machine.advance();
    expect(machine.getSnapshot().phase).toBe('completed');
  });

  it('brings a card missed twice back twice', () => {
    const { driver, machine } = startSession([firstCard]);
    machine.showMove();
    machine.advance();
    machine.showMove();
    machine.advance();
    expect(machine.getSnapshot()).toMatchObject({ phase: 'asking', current: firstCard });
    expect(driver.storedEvents).toHaveLength(1);
    expect(machine.getSnapshot().answeredCount).toBe(1);
  });

  it('drops the pending opponent move of a session that was replaced', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    machine.start({ cards: [firstCard], newCardCount: 0 });
    const restarted = machine.getSnapshot();
    expect(restarted.cardCount).toBe(1);
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toBe(restarted);
    driver.fireNextTimer();
    expect(machine.getSnapshot().isOpponentMovePending).toBe(false);
  });

  it('drops the pending opponent move of a card that is no longer asked', () => {
    const { driver, machine } = startSession([firstCard, secondCard]);
    machine.showMove();
    machine.advance();
    const asking = machine.getSnapshot();
    expect(asking.isOpponentMovePending).toBe(true);
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toBe(asking);
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      fen: secondCard.card.fen,
      isOpponentMovePending: false,
    });
  });

  it('starts every session from zero', () => {
    const { driver, machine } = startSession([firstCard]);
    driver.fireNextTimer();
    machine.playMove('d7d5');
    machine.start({ cards: [firstCard], newCardCount: 0 });
    expect(machine.getSnapshot()).toMatchObject({
      answeredCount: 0,
      recalledCount: 0,
      outcome: null,
    });
    driver.fireNextTimer();
    machine.playMove('d7d5');
    expect(driver.storedEvents).toHaveLength(2);
  });

  it('notifies a subscriber on each change and stops after it unsubscribes', () => {
    const driver = buildReviewDriver();
    const machine = createReviewMachine(driver.options);
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);
    machine.start({ cards: [firstCard], newCardCount: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
    driver.fireNextTimer();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    machine.playMove('d7d5');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('what the screen reads off a snapshot', () => {
  const asking: ReviewSnapshot = {
    phase: 'asking',
    current: firstCard,
    fen: firstCard.card.fen,
    isOpponentMovePending: false,
    outcome: null,
    cardCount: 4,
    answeredCount: 0,
    recalledCount: 0,
  };

  it('counts the card on the board from one, never past the session, and stays put once it is answered', () => {
    expect(selectSessionPosition(asking)).toBe(1);
    expect(selectSessionPosition({ ...asking, answeredCount: 2 })).toBe(3);
    expect(selectSessionPosition({ ...asking, answeredCount: 4 })).toBe(4);
    expect(selectSessionPosition({ ...asking, phase: 'answered', answeredCount: 1 })).toBe(1);
    expect(selectSessionPosition({ ...asking, phase: 'answered', answeredCount: 3 })).toBe(3);
    expect(selectSessionPosition({ ...asking, phase: 'answered', answeredCount: 0 })).toBe(1);
    expect(
      selectSessionPosition({ ...asking, phase: 'completed', answeredCount: 0, cardCount: 0 }),
    ).toBe(1);
  });

  it('gives the recalled share as a whole percent', () => {
    expect(selectRecalledPercent(asking)).toBe(0);
    expect(selectRecalledPercent({ ...asking, answeredCount: 3, recalledCount: 2 })).toBe(67);
    expect(selectRecalledPercent({ ...asking, answeredCount: 4, recalledCount: 4 })).toBe(100);
  });

  it('names the status of the card', () => {
    expect(selectReviewStatus(asking)).toBe('your-move');
    expect(selectReviewStatus({ ...asking, isOpponentMovePending: true })).toBe('opponent-moving');
    expect(selectReviewStatus({ ...asking, phase: 'answered', outcome: 'recalled' })).toBe(
      'recalled',
    );
    expect(selectReviewStatus({ ...asking, phase: 'answered', outcome: 'missed' })).toBe('missed');
  });

  it('shows the book move only once the card is answered', () => {
    expect(listAnswerMoves(asking)).toEqual([]);
    expect(listAnswerMoves({ ...asking, phase: 'answered', outcome: 'missed' })).toEqual(['d7d5']);
    expect(listAnswerMoves({ ...asking, phase: 'answered', current: null })).toEqual([]);
    expect(listAnswerMoves({ ...asking, phase: 'completed' })).toEqual([]);
  });

  it('lets the board keep a recalled move and take back any other', () => {
    expect(isMoveAccepted('recalled')).toBe(true);
    expect(isMoveAccepted('continued')).toBe(true);
    expect(isMoveAccepted('missed')).toBe(false);
    expect(isMoveAccepted('ignored')).toBe(false);
  });
});

describe('a trap card', () => {
  it('replays the opponent move, then answers each right reader move with the next reply', () => {
    const { driver, machine } = startSession([TRAP_CARD]);
    expect(machine.getSnapshot().fen).toBe(EXAMPLE_TRAP_CARD.fen);
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      fen: TRAP_FIRST_STEP.fen,
      isOpponentMovePending: false,
    });
    expect(machine.playMove('e5d3')).toBe('continued');
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'asking',
      fen: TRAP_FIRST_STEP.answerFen,
      isOpponentMovePending: true,
    });
    expect(machine.playMove('g4d1')).toBe('ignored');
    expect(driver.pendingTimers.map((timer) => timer.delayMilliseconds)).toEqual([450]);
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      fen: TRAP_LAST_STEP.fen,
      isOpponentMovePending: false,
    });
    expect(driver.storedEvents).toEqual([]);
    expect(machine.playMove('g4d1')).toBe('recalled');
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'answered',
      outcome: 'recalled',
      fen: TRAP_CARD.answerFen,
      recalledCount: 1,
    });
    expect(driver.productEvents.at(-1)).toEqual({
      name: 'card_reviewed',
      cardKind: 'trap',
      outcome: 'recalled',
    });
  });

  it('misses a trap card on its second move, and asks it again from its start', () => {
    const { driver, machine } = startSession([TRAP_CARD]);
    driver.fireNextTimer();
    machine.playMove('e5d3');
    driver.fireNextTimer();
    expect(machine.playMove('g4e2')).toBe('missed');
    expect(machine.getSnapshot()).toMatchObject({ outcome: 'missed', fen: TRAP_CARD.answerFen });
    machine.advance();
    driver.fireNextTimer();
    expect(machine.getSnapshot().fen).toBe(TRAP_FIRST_STEP.fen);
    expect(machine.playMove('g4d1')).toBe('missed');
  });

  it('drops a reply that lands after the trap card was answered', () => {
    const { driver, machine } = startSession([TRAP_CARD]);
    driver.fireNextTimer();
    machine.playMove('e5d3');
    machine.showMove();
    driver.fireNextTimer();
    expect(machine.getSnapshot().fen).toBe(TRAP_CARD.answerFen);
  });

  it('drops a reply that lands after the trap card was asked again', () => {
    const { driver, machine } = startSession([TRAP_CARD]);
    driver.fireNextTimer();
    machine.playMove('e5d3');
    machine.showMove();
    machine.advance();
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      fen: EXAMPLE_TRAP_CARD.fen,
      isOpponentMovePending: true,
    });
  });

  it('drops a reply of a trap card that lands on the next trap card', () => {
    const { driver, machine } = startSession([TRAP_CARD, SECOND_TRAP_CARD]);
    driver.fireNextTimer();
    machine.playMove('e5d3');
    machine.showMove();
    machine.advance();
    const [staleReply, opponentMove] = driver.pendingTimers.splice(0);
    opponentMove?.callback();
    machine.playMove('e5d3');
    staleReply?.callback();
    expect(machine.getSnapshot()).toMatchObject({
      current: SECOND_TRAP_CARD,
      fen: TRAP_FIRST_STEP.answerFen,
      isOpponentMovePending: true,
    });
  });

  it('drops a reply of a session that was replaced', () => {
    const { driver, machine } = startSession([TRAP_CARD]);
    driver.fireNextTimer();
    machine.playMove('e5d3');
    machine.start({ cards: [TRAP_CARD], newCardCount: 0 });
    const [staleReply, opponentMove] = driver.pendingTimers.splice(0);
    opponentMove?.callback();
    machine.playMove('e5d3');
    staleReply?.callback();
    expect(machine.getSnapshot()).toMatchObject({
      fen: TRAP_FIRST_STEP.answerFen,
      isOpponentMovePending: true,
    });
  });

  it('shows the position of a card that has an opponent move and no step', () => {
    const { driver, machine } = startSession([{ ...TRAP_CARD, steps: [] }]);
    driver.fireNextTimer();
    expect(machine.getSnapshot().fen).toBe(EXAMPLE_TRAP_CARD.fen);
    expect(machine.playMove('e5d3')).toBe('ignored');
  });
});

describe('a name card', () => {
  it('asks at once, ignores a board move, and recalls the right name', () => {
    const { driver, machine } = startSession([NAME_CARD]);
    expect(machine.getSnapshot()).toMatchObject({
      fen: EXAMPLE_NAME_CARD.fen,
      isOpponentMovePending: false,
    });
    expect(driver.pendingTimers).toEqual([]);
    expect(machine.playMove('g8f6')).toBe('ignored');
    expect(machine.chooseName('Vienna Game')).toBe('recalled');
    expect(machine.getSnapshot()).toMatchObject({ outcome: 'recalled', recalledCount: 1 });
    expect(driver.productEvents.at(-1)).toEqual({
      name: 'card_reviewed',
      cardKind: 'name',
      outcome: 'recalled',
    });
    expect(machine.chooseName('Vienna Game')).toBe('ignored');
  });

  it('misses another name, and ignores a name for a card of another kind', () => {
    const { driver, machine } = startSession([NAME_CARD, firstCard]);
    expect(machine.chooseName('Ruy Lopez')).toBe('missed');
    expect(driver.storedEvents.map((event) => event.outcome)).toEqual(['missed']);
    machine.advance();
    expect(machine.chooseName('Vienna Game')).toBe('ignored');
    expect(machine.getSnapshot().phase).toBe('asking');
  });
});

describe('what the screen reads off a trap card or a name card', () => {
  const answered: ReviewSnapshot = {
    phase: 'answered',
    current: TRAP_CARD,
    fen: TRAP_CARD.answerFen,
    isOpponentMovePending: false,
    outcome: 'missed',
    cardCount: 1,
    answeredCount: 1,
    recalledCount: 0,
  };

  it('shows the last reader move of a trap, and no move for a name card', () => {
    expect(listAnswerMoves(answered)).toEqual(['g4d1']);
    expect(listAnswerMoves({ ...answered, current: NAME_CARD })).toEqual([]);
  });

  it('shows the idea of a move card once answered, and never on another kind', () => {
    expect(isIdeaShown({ ...answered, current: firstCard })).toBe(true);
    expect(isIdeaShown({ ...answered, current: firstCard, phase: 'asking' })).toBe(false);
    expect(isIdeaShown(answered)).toBe(false);
    expect(isIdeaShown({ ...answered, current: null })).toBe(false);
  });

  it('names the opening of a name card, and nothing for another kind', () => {
    expect(selectOpeningName(NAME_CARD)).toBe('Vienna Game');
    expect(selectOpeningName(TRAP_CARD)).toBe('');
  });

  it('offers the four names, and marks the right one once the card is answered', () => {
    expect(listNameChoices(NAME_CARD, 'your-move')).toEqual(
      EXAMPLE_NAME_CARD.choices.map((openingName) => ({
        openingName,
        isRightName: false,
        isLocked: false,
      })),
    );
    for (const status of ['recalled', 'missed'] as const) {
      expect(listNameChoices(NAME_CARD, status)).toEqual(
        EXAMPLE_NAME_CARD.choices.map((openingName) => ({
          openingName,
          isRightName: openingName === 'Vienna Game',
          isLocked: true,
        })),
      );
    }
    expect(listNameChoices(TRAP_CARD, 'missed')).toEqual([]);
  });
});
