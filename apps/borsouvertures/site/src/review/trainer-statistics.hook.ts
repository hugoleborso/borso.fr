import { use, useMemo } from 'react';
import type { BuiltDeck } from '@/decks/deck.utils';
import { readNow, readUtcOffsetMinutes } from './review-effects.setup';
import { readReviewLogRequest, useReviewLog } from './review-log.store';
import { readSchedulerRequest } from './scheduler-resource.setup';
import { projectTrainerStatistics, type TrainerStatistics } from './trainer-statistics.core';

// @FollowsBlueprint hook-external-store
export function useTrainerStatistics(decks: readonly BuiltDeck[]): TrainerStatistics {
  use(readReviewLogRequest());
  const scheduler = use(readSchedulerRequest());
  const { events } = useReviewLog();
  return useMemo(
    () =>
      projectTrainerStatistics({
        decks,
        events,
        scheduler,
        now: readNow(),
        utcOffsetMinutes: readUtcOffsetMinutes(),
      }),
    [decks, events, scheduler],
  );
}
