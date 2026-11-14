import {
  type CardId,
  listReviewEventsInReplayOrder,
  type ReviewEvent,
  type ReviewOutcome,
  selectReplayInstant,
} from '@domain/review-event.core';
import { type DefaultScheduler, type DefaultSchedulerCard, Rating } from 'ts-fsrs';

export const SCHEDULER_CONFIGURATION = {
  version: 'FSRS-6',
  desiredRetention: 0.9,
  maximumInterval: 365,
  enableShortTerm: false,
  learningSteps: [],
  relearningSteps: [],
  enableFuzz: false,
} as const;

export type Scheduler = Pick<DefaultScheduler<'FSRS-6'>, 'newCard' | 'review'>;
type SchedulerCard = DefaultSchedulerCard<'FSRS-6'>;

export interface CardState {
  cardId: CardId;
  dueAt: string | null;
  stability: number;
  difficulty: number;
  lapses: number;
}

const GRADE_BY_OUTCOME = {
  recalled: Rating.Good,
  missed: Rating.Again,
} as const satisfies Record<ReviewOutcome, Rating>;

function buildCardState(cardId: CardId, card: SchedulerCard): CardState {
  return {
    cardId,
    dueAt: card.dueAt.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    lapses: card.lapses,
  };
}

// @FollowsBlueprint core-projection
export function replayCardStates(
  events: readonly ReviewEvent[],
  scheduler: Scheduler,
  now: Date,
): ReadonlyMap<CardId, CardState> {
  const cards = new Map<CardId, SchedulerCard>();
  for (const event of listReviewEventsInReplayOrder(events, now)) {
    const moment = { now: selectReplayInstant(event, now) };
    const card = cards.get(event.cardId) ?? scheduler.newCard(moment);
    const reviewed = scheduler.review({ ...moment, card, grade: GRADE_BY_OUTCOME[event.outcome] });
    cards.set(event.cardId, reviewed.card);
  }
  return new Map([...cards].map(([cardId, card]) => [cardId, buildCardState(cardId, card)]));
}
