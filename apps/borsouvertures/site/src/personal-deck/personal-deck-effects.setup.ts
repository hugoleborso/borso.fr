import { deriveCalendarDay } from '@domain/calendar-day.core';
import type { DeckLineEventKind } from '@domain/deck-line-event.core';
import {
  buildUuid,
  readNow,
  readThisDeviceId,
  readUtcOffsetMinutes,
} from '@/review/review-effects.setup';
import type { Side } from '@/state/persistedState.utils';
import { appendDeckLineEvent } from './deck-line-log.store';

export interface DeckLineChange {
  readonly kind: DeckLineEventKind;
  readonly side: Side;
  readonly movesUci: readonly string[];
  readonly openingName: string | null;
}

// @FollowsBlueprint machine-impure-edge
export function recordDeckLineChange(change: DeckLineChange): void {
  const now = readNow();
  appendDeckLineEvent({
    id: buildUuid(),
    kind: change.kind,
    side: change.side,
    movesUci: [...change.movesUci],
    openingName: change.openingName,
    occurredAt: now.toISOString(),
    calendarDay: deriveCalendarDay(now, readUtcOffsetMinutes()),
    deviceId: readThisDeviceId(),
    receivedAt: null,
  });
}
