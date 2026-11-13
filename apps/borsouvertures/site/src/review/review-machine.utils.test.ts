import { describe, expect, it, vi } from 'vitest';
import { listReviewCards, type ReviewCard } from '@/decks/card.core';
import { buildExampleDeck } from '@/decks/deck.test-utils';
import { buildReviewDriver } from './review-machine.test-utils';
import {
  createReviewMachine,
  isMoveAccepted,
  listAnswerMoves,
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

const WHITE_FIRST_MOVE: ReviewCard = {
  ...firstCard,
  opponentMove: null,
  card: { ...firstCard.card, cardId: 'move:vienna-game:start', opponentMoveUci: null },
};

function startSession(cards: readonly ReviewCard[], newCardCount = 0) {
  const driver = buildReviewDriver();
  const machine = createReviewMachine(driver.options);
  machine.start({ cards, newCardCount });
  return { driver, machine };
}

// @FollowsBlueprint test-machine-transition
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
    expect(isMoveAccepted('missed')).toBe(false);
    expect(isMoveAccepted('ignored')).toBe(false);
  });
});
