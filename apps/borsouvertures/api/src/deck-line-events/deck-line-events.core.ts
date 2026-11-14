import type { DeckLineEvent, DeckLineEventKind, DeckLineSide } from '@domain/deck-line-event.core';
import type { DeckLineEventRow } from './deck-line-events.schema';

export type StoredDeckLineEvent = Readonly<DeckLineEventRow>;

const MOVE_SEPARATOR = ' ';

function parseStoredKind(kind: string): DeckLineEventKind {
  return kind === 'line-removed' ? 'line-removed' : 'line-added';
}

function parseStoredSide(side: string): DeckLineSide {
  return side === 'black' ? 'black' : 'white';
}

// @FollowsBlueprint core-projection
export function projectDeckLineEvent(row: StoredDeckLineEvent): DeckLineEvent {
  return {
    id: row.id,
    kind: parseStoredKind(row.kind),
    side: parseStoredSide(row.side),
    movesUci: row.movesUci.split(MOVE_SEPARATOR),
    openingName: row.openingName,
    occurredAt: row.occurredAt.toISOString(),
    calendarDay: row.calendarDay,
    deviceId: row.deviceId,
    receivedAt: row.receivedAt.toISOString(),
  };
}

export function buildDeckLineEventRow(event: DeckLineEvent, now: Date): StoredDeckLineEvent {
  return {
    id: event.id,
    kind: event.kind,
    side: event.side,
    movesUci: event.movesUci.join(MOVE_SEPARATOR),
    openingName: event.openingName,
    occurredAt: new Date(event.occurredAt),
    calendarDay: event.calendarDay,
    deviceId: event.deviceId,
    receivedAt: now,
  };
}
