import { use, useMemo } from 'react';
import type { BuiltDeck } from '@/decks/deck.utils';
import { useAppState } from '@/state/appState';
import { projectTrainerProgress, type TrainerProgress } from './daily-plan.core';
import { readNow, readUtcOffsetMinutes } from './review-effects.setup';
import { readReviewLogRequest, useReviewLog } from './review-log.store';
import { readSchedulerRequest } from './scheduler-resource.setup';

// @FollowsBlueprint hook-external-store
export function useTrainerProgress(decks: readonly BuiltDeck[]): TrainerProgress {
  use(readReviewLogRequest());
  const scheduler = use(readSchedulerRequest());
  const { events } = useReviewLog();
  const { newCardsPerDay } = useAppState();
  return useMemo(
    () =>
      projectTrainerProgress({
        decks,
        events,
        scheduler,
        now: readNow(),
        utcOffsetMinutes: readUtcOffsetMinutes(),
        newCardsPerDay,
      }),
    [decks, events, scheduler, newCardsPerDay],
  );
}
