import { deriveCalendarDay } from '@domain/calendar-day.core';
import type { ReviewEvent } from '@domain/review-event.core';
import { listDeckCards } from '@/decks/card.core';
import type { BuiltDeck } from '@/decks/deck.utils';
import {
  type DeckRetentionWeeks,
  type DeckShare,
  listDeckReviews,
  listDueReviews,
  projectDeckAccuracy,
  projectDeckRetention,
  projectRecentRetention,
  projectRetentionWeeks,
} from './retention.core';
import type { Scheduler } from './scheduler.core';
import { countStreakDays } from './streak.core';

export interface TrainerStatistics {
  streakDays: number;
  recentRetention: DeckShare[];
  retentionWeeks: DeckRetentionWeeks[];
  accuracy: DeckShare[];
}

export interface TrainerStatisticsInput {
  decks: readonly BuiltDeck[];
  events: readonly ReviewEvent[];
  scheduler: Scheduler;
  now: Date;
  utcOffsetMinutes: number;
}

// @FollowsBlueprint core-view-projection
export function projectTrainerStatistics(input: TrainerStatisticsInput): TrainerStatistics {
  const cards = listDeckCards(input.decks);
  const deckIds = input.decks.map((deck) => deck.id);
  const today = deriveCalendarDay(input.now, input.utcOffsetMinutes);
  const dueReviews = listDueReviews(input.events, cards, input.scheduler, input.now);
  return {
    streakDays: countStreakDays(input.events, today),
    recentRetention: projectRecentRetention(dueReviews, deckIds, today),
    retentionWeeks: projectRetentionWeeks(projectDeckRetention(dueReviews), deckIds, today),
    accuracy: projectDeckAccuracy(listDeckReviews(input.events, cards, input.now), deckIds),
  };
}
