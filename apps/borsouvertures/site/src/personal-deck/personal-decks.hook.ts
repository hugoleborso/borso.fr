import { use, useMemo } from 'react';
import type { BuiltDeck } from '@/decks/deck.utils';
import { readNow } from '@/review/review-effects.setup';
import { readDeckLineLogRequest, useDeckLineLog } from './deck-line-log.store';
import { buildPersonalDecks, type PersonalLine, replayPersonalLines } from './personal-deck.core';

// @FollowsBlueprint hook-external-store
export function usePersonalLines(): PersonalLine[] {
  use(readDeckLineLogRequest());
  const { events } = useDeckLineLog();
  return useMemo(() => replayPersonalLines(events, readNow()), [events]);
}

export function usePersonalDecks(): BuiltDeck[] {
  const lines = usePersonalLines();
  return useMemo(() => buildPersonalDecks(lines), [lines]);
}
