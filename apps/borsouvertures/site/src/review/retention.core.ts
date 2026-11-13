import { type CalendarDay, countDaysBetween, shiftCalendarDay } from '@domain/calendar-day.core';
import {
  type CardId,
  listReviewEventsInReplayOrder,
  type ReviewEvent,
  type ReviewOutcome,
  selectReplayInstant,
} from '@domain/review-event.core';
import type { Card } from '@/decks/card.core';
import { replayCardStates, type Scheduler } from './scheduler.core';

export interface DeckRetention {
  deckId: string;
  weekStart: CalendarDay;
  dueReviews: number;
  recalled: number;
}

export interface DeckReview {
  deckId: string;
  calendarDay: CalendarDay;
  outcome: ReviewOutcome;
}

export type RecallShareKind = 'measured' | 'empty';

export interface RecallShare {
  kind: RecallShareKind;
  reviews: number;
  recalled: number;
  percent: number;
}

export interface DeckShare extends RecallShare {
  deckId: string;
}

export interface RetentionWeek extends RecallShare {
  weekStart: CalendarDay;
}

export interface DeckRetentionWeeks {
  deckId: string;
  weeks: RetentionWeek[];
}

export const RETENTION_WEEK_COUNT = 12;
export const RECENT_RETENTION_DAY_COUNT = 30;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const DAYS_FROM_MONDAY_TO_SUNDAY = 6;
const FULL_SHARE_PERCENT = 100;

export function selectWeekStart(day: CalendarDay): CalendarDay {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  return shiftCalendarDay(day, -((weekday + DAYS_FROM_MONDAY_TO_SUNDAY) % DAYS_PER_WEEK));
}

function countRecalled(outcomes: readonly ReviewOutcome[]): number {
  return outcomes.filter((outcome) => outcome === 'recalled').length;
}

export function buildRecallShare(reviews: number, recalled: number): RecallShare {
  if (reviews === 0) return { kind: 'empty', reviews, recalled, percent: 0 };
  return {
    kind: 'measured',
    reviews,
    recalled,
    percent: Math.round((FULL_SHARE_PERCENT * recalled) / reviews),
  };
}

function wasCardDue(
  earlier: readonly ReviewEvent[],
  event: ReviewEvent,
  scheduler: Scheduler,
  now: Date,
): boolean {
  const previous = earlier.at(-1);
  if (previous === undefined) return false;
  // Stryker disable next-line OptionalChaining: equivalent mutant, earlier holds at least one review of this card, so its replayed state always exists.
  const dueAt = replayCardStates(earlier, scheduler, now).get(event.cardId)?.dueAt;
  const scheduledInterval =
    Date.parse(String(dueAt)) - selectReplayInstant(previous, now).getTime();
  const daysSincePrevious = countDaysBetween(previous.calendarDay, event.calendarDay);
  return scheduledInterval <= daysSincePrevious * MILLISECONDS_PER_DAY;
}

function listCardReviews(
  events: readonly ReviewEvent[],
  cards: readonly Card[],
  now: Date,
): { deckId: string; reviews: ReviewEvent[] }[] {
  const deckIdByCard = new Map(cards.map((card) => [card.cardId, card.deckId]));
  const reviewsByCard = new Map<CardId, { deckId: string; reviews: ReviewEvent[] }>();
  for (const event of listReviewEventsInReplayOrder(events, now)) {
    const deckId = deckIdByCard.get(event.cardId);
    if (deckId === undefined) continue;
    const known = reviewsByCard.get(event.cardId) ?? { deckId, reviews: [] };
    known.reviews.push(event);
    reviewsByCard.set(event.cardId, known);
  }
  return [...reviewsByCard.values()];
}

function buildDeckReview(deckId: string, event: ReviewEvent): DeckReview {
  return { deckId, calendarDay: event.calendarDay, outcome: event.outcome };
}

export function listDeckReviews(
  events: readonly ReviewEvent[],
  cards: readonly Card[],
  now: Date,
): DeckReview[] {
  return listCardReviews(events, cards, now).flatMap(({ deckId, reviews }) =>
    reviews.map((event) => buildDeckReview(deckId, event)),
  );
}

export function listDueReviews(
  events: readonly ReviewEvent[],
  cards: readonly Card[],
  scheduler: Scheduler,
  now: Date,
): DeckReview[] {
  return listCardReviews(events, cards, now).flatMap(({ deckId, reviews }) =>
    reviews
      .filter((event, index) => wasCardDue(reviews.slice(0, index), event, scheduler, now))
      .map((event) => buildDeckReview(deckId, event)),
  );
}

// @FollowsBlueprint core-projection
export function projectDeckRetention(dueReviews: readonly DeckReview[]): DeckRetention[] {
  const retentionByWeek = new Map<string, DeckRetention>();
  for (const review of dueReviews) {
    const weekStart = selectWeekStart(review.calendarDay);
    const key = `${review.deckId} ${weekStart}`;
    const known = retentionByWeek.get(key) ?? {
      deckId: review.deckId,
      weekStart,
      dueReviews: 0,
      recalled: 0,
    };
    retentionByWeek.set(key, {
      ...known,
      dueReviews: known.dueReviews + 1,
      recalled: known.recalled + countRecalled([review.outcome]),
    });
  }
  const retentionsByWeekKey: [string, DeckRetention][] = [...retentionByWeek.entries()];
  return retentionsByWeekKey
    .sort((left, right) => left[0].localeCompare(right[0], 'en'))
    .map((entry) => entry[1]);
}

function projectDeckShares(
  reviews: readonly DeckReview[],
  deckIds: readonly string[],
): DeckShare[] {
  return deckIds.map((deckId) => {
    const outcomes = reviews
      .filter((review) => review.deckId === deckId)
      .map((review) => review.outcome);
    return { deckId, ...buildRecallShare(outcomes.length, countRecalled(outcomes)) };
  });
}

export function projectRecentRetention(
  dueReviews: readonly DeckReview[],
  deckIds: readonly string[],
  today: CalendarDay,
): DeckShare[] {
  const firstDay = shiftCalendarDay(today, 1 - RECENT_RETENTION_DAY_COUNT);
  return projectDeckShares(
    dueReviews.filter((review) => review.calendarDay >= firstDay && review.calendarDay <= today),
    deckIds,
  );
}

export function projectDeckAccuracy(
  reviews: readonly DeckReview[],
  deckIds: readonly string[],
): DeckShare[] {
  return projectDeckShares(reviews, deckIds);
}

function buildRetentionWeek(
  retention: readonly DeckRetention[],
  deckId: string,
  weekStart: CalendarDay,
): RetentionWeek {
  const row = retention.find(
    (candidate) => candidate.deckId === deckId && candidate.weekStart === weekStart,
  );
  return { weekStart, ...buildRecallShare(row?.dueReviews ?? 0, row?.recalled ?? 0) };
}

export function projectRetentionWeeks(
  retention: readonly DeckRetention[],
  deckIds: readonly string[],
  today: CalendarDay,
): DeckRetentionWeeks[] {
  const latestWeekStart = selectWeekStart(today);
  const weekStarts = Array.from({ length: RETENTION_WEEK_COUNT }, (_, index) =>
    shiftCalendarDay(latestWeekStart, (index + 1 - RETENTION_WEEK_COUNT) * DAYS_PER_WEEK),
  );
  return deckIds.map((deckId) => ({
    deckId,
    weeks: weekStarts.map((weekStart) => buildRetentionWeek(retention, deckId, weekStart)),
  }));
}
