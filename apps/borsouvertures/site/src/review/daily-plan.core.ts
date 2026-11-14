import { type CalendarDay, deriveCalendarDay, shiftCalendarDay } from '@domain/calendar-day.core';
import type { CardId, ReviewEvent } from '@domain/review-event.core';
import { type Card, listDeckCards } from '@/decks/card.core';
import type { BuiltDeck } from '@/decks/deck.utils';
import { type CardState, replayCardStates, type Scheduler } from './scheduler.core';

export interface DailyPlan {
  day: CalendarDay;
  dueCardIds: CardId[];
  newCardIds: CardId[];
}

export interface DailyPlanInput {
  cards: readonly Card[];
  states: ReadonlyMap<CardId, CardState>;
  events: readonly ReviewEvent[];
  today: CalendarDay;
  utcOffsetMinutes: number;
  newCardsPerDay: number;
}

export interface DeckProgress {
  deckId: string;
  cardCount: number;
  dueCount: number;
  newCount: number;
  sessionCardIds: CardId[];
}

export interface TrainerProgress {
  plan: DailyPlan;
  sessionCardIds: CardId[];
  dueTomorrowCount: number;
  deckProgress: DeckProgress[];
}

export interface TrainerProgressInput {
  decks: readonly BuiltDeck[];
  events: readonly ReviewEvent[];
  scheduler: Scheduler;
  now: Date;
  utcOffsetMinutes: number;
  newCardsPerDay: number;
}

const START_OF_DAY = 'T00:00:00.000Z';

function readScheduledDay(card: Card): CalendarDay | null {
  // Stryker disable next-line ConditionalExpression: equivalent mutant, only a move card ever carries dueFromDay, so reading it on a name or trap card also answers null.
  return card.kind === 'move' ? (card.dueFromDay ?? null) : null;
}

function readFirstDueInstant(card: Card, day: CalendarDay): string | null {
  const scheduledDay = readScheduledDay(card);
  if (scheduledDay === null || scheduledDay > day) return null;
  return `${scheduledDay}${START_OF_DAY}`;
}

function readDueInstant(
  card: Card,
  state: CardState | undefined,
  day: CalendarDay,
  utcOffsetMinutes: number,
): string | null {
  if (state === undefined) return readFirstDueInstant(card, day);
  const dueAt = state.dueAt;
  const isDue =
    typeof dueAt === 'string' && deriveCalendarDay(new Date(dueAt), utcOffsetMinutes) <= day;
  return isDue ? dueAt : null;
}

function isDueOn(
  card: Card,
  state: CardState | undefined,
  day: CalendarDay,
  utcOffsetMinutes: number,
): boolean {
  return readDueInstant(card, state, day, utcOffsetMinutes) !== null;
}

function isNewInTheDailyLimit(card: Card, states: ReadonlyMap<CardId, CardState>): boolean {
  return !states.has(card.cardId) && readScheduledDay(card) === null;
}

export function countCardsIntroducedOn(events: readonly ReviewEvent[], day: CalendarDay): number {
  const firstDayByCard = new Map<CardId, CalendarDay>();
  const latestDayFirst = events.toSorted((left, right) =>
    right.calendarDay.localeCompare(left.calendarDay, 'en'),
  );
  for (const event of latestDayFirst) firstDayByCard.set(event.cardId, event.calendarDay);
  return [...firstDayByCard.values()].filter((firstDay) => firstDay === day).length;
}

export function countCardsDueOn(
  cards: readonly Card[],
  states: ReadonlyMap<CardId, CardState>,
  day: CalendarDay,
  utcOffsetMinutes: number,
): number {
  return cards.filter((card) => isDueOn(card, states.get(card.cardId), day, utcOffsetMinutes))
    .length;
}

// @FollowsBlueprint core-view-projection
export function buildDailyPlan(input: DailyPlanInput): DailyPlan {
  const { cards, states, today, utcOffsetMinutes } = input;
  const dueCardIds = cards
    .map((card) => ({
      cardId: card.cardId,
      dueAt: readDueInstant(card, states.get(card.cardId), today, utcOffsetMinutes),
    }))
    .filter((due): due is { cardId: CardId; dueAt: string } => due.dueAt !== null)
    .toSorted(
      (left, right) =>
        left.dueAt.localeCompare(right.dueAt, 'en') ||
        left.cardId.localeCompare(right.cardId, 'en'),
    )
    .map((due) => due.cardId);
  const remainingNewCards = Math.max(
    0,
    input.newCardsPerDay - countCardsIntroducedOn(input.events, today),
  );
  const newCardIds = cards
    .filter((card) => isNewInTheDailyLimit(card, states))
    .slice(0, remainingNewCards)
    .map((card) => card.cardId);
  return { day: today, dueCardIds, newCardIds };
}

export function selectDeckSessionCardIds(
  deck: BuiltDeck,
  plan: DailyPlan,
  states: ReadonlyMap<CardId, CardState>,
): CardId[] {
  const deckCardIds = new Set(deck.cards.map((card) => card.cardId));
  const planned = [...plan.dueCardIds, ...plan.newCardIds].filter((cardId) =>
    deckCardIds.has(cardId),
  );
  if (planned.length > 0) return planned;
  return deck.cards
    .filter((card) => states.has(card.cardId) || readScheduledDay(card) !== null)
    .map((card) => card.cardId);
}

function projectDeckProgress(
  deck: BuiltDeck,
  plan: DailyPlan,
  states: ReadonlyMap<CardId, CardState>,
): DeckProgress {
  const deckCardIds = new Set(deck.cards.map((card) => card.cardId));
  return {
    deckId: deck.id,
    cardCount: deck.cards.length,
    dueCount: plan.dueCardIds.filter((cardId) => deckCardIds.has(cardId)).length,
    newCount: deck.cards.filter((card) => !states.has(card.cardId)).length,
    sessionCardIds: selectDeckSessionCardIds(deck, plan, states),
  };
}

export function projectTrainerProgress(input: TrainerProgressInput): TrainerProgress {
  const cards = listDeckCards(input.decks);
  const states = replayCardStates(input.events, input.scheduler, input.now);
  const today = deriveCalendarDay(input.now, input.utcOffsetMinutes);
  const plan = buildDailyPlan({
    cards,
    states,
    events: input.events,
    today,
    utcOffsetMinutes: input.utcOffsetMinutes,
    newCardsPerDay: input.newCardsPerDay,
  });
  return {
    plan,
    sessionCardIds: [...plan.dueCardIds, ...plan.newCardIds],
    dueTomorrowCount: countCardsDueOn(
      cards,
      states,
      shiftCalendarDay(today, 1),
      input.utcOffsetMinutes,
    ),
    deckProgress: input.decks.map((deck) => projectDeckProgress(deck, plan, states)),
  };
}

export function findDeckProgress(progress: TrainerProgress, deckId: string): DeckProgress | null {
  return progress.deckProgress.find((deck) => deck.deckId === deckId) ?? null;
}

export function selectSessionCardIds(progress: TrainerProgress, deckId: string | null): CardId[] {
  if (deckId === null) return progress.sessionCardIds;
  return findDeckProgress(progress, deckId)?.sessionCardIds ?? [];
}

export function countNewCards(plan: DailyPlan, cardIds: readonly CardId[]): number {
  return cardIds.filter((cardId) => plan.newCardIds.includes(cardId)).length;
}
