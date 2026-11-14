import { type CalendarDay, isCalendarDay } from './calendar-day.core';
import {
  isEventRecord,
  mergeSyncedEvents,
  parseInstant,
  parseReceivedAt,
  parseUuid,
  type SyncedEvent,
  selectEarliestInstant,
  sortByInstantThenId,
} from './synced-event.core';

export type DeckLineSide = 'white' | 'black';
export type DeckLineEventKind = 'line-added' | 'line-removed';

export interface DeckLineEvent extends SyncedEvent {
  id: string;
  kind: DeckLineEventKind;
  side: DeckLineSide;
  movesUci: string[];
  openingName: string | null;
  occurredAt: string;
  calendarDay: CalendarDay;
  deviceId: string;
  receivedAt: string | null;
}

export const DECK_LINE_EVENT_BATCH_LIMIT = 500;
export const MAX_DECK_LINE_PLIES = 80;
export const MAX_OPENING_NAME_LENGTH = 200;

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const LINE_KEY_SEPARATOR = ':';
const MOVE_SEPARATOR = ' ';

function parseKind(value: unknown): DeckLineEventKind | null {
  return value === 'line-added' || value === 'line-removed' ? value : null;
}

function parseSide(value: unknown): DeckLineSide | null {
  return value === 'white' || value === 'black' ? value : null;
}

function parseUciMove(value: unknown): string | null {
  const text = String(value);
  return text === value && UCI_MOVE_PATTERN.test(text) ? text : null;
}

function parseMoves(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_DECK_LINE_PLIES) {
    return null;
  }
  const moves = value.map((entry: unknown) => parseUciMove(entry));
  return moves.every((move): move is string => move !== null) ? moves : null;
}

function parseDay(value: unknown): CalendarDay | null {
  const text = String(value);
  return text === value && isCalendarDay(text) ? text : null;
}

function parseOpeningName(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const isName = value.length > 0 && value.length <= MAX_OPENING_NAME_LENGTH;
  return isName ? value : undefined;
}

// @FollowsBlueprint domain-shared-selection
export function parseDeckLineEvent(value: unknown): DeckLineEvent | null {
  if (!isEventRecord(value)) return null;
  const id = parseUuid(value.id);
  const kind = parseKind(value.kind);
  const side = parseSide(value.side);
  const movesUci = parseMoves(value.movesUci);
  const openingName = parseOpeningName(value.openingName);
  const occurredAt = parseInstant(value.occurredAt);
  const calendarDay = parseDay(value.calendarDay);
  const deviceId = parseUuid(value.deviceId);
  const receivedAt = parseReceivedAt(value.receivedAt);
  if (
    id === null ||
    kind === null ||
    side === null ||
    movesUci === null ||
    openingName === undefined ||
    occurredAt === null ||
    calendarDay === null ||
    deviceId === null ||
    receivedAt === undefined
  ) {
    return null;
  }
  return { id, kind, side, movesUci, openingName, occurredAt, calendarDay, deviceId, receivedAt };
}

export function listValidDeckLineEvents(values: readonly unknown[]): DeckLineEvent[] {
  return values
    .map((value) => parseDeckLineEvent(value))
    .filter((event): event is DeckLineEvent => event !== null);
}

export function listDeckLineEventsInReplayOrder(
  events: readonly DeckLineEvent[],
  now: Date,
): DeckLineEvent[] {
  return sortByInstantThenId(events, (event) =>
    selectEarliestInstant(event, event.occurredAt, now),
  );
}

export function mergeDeckLineEvents(
  local: readonly DeckLineEvent[],
  remote: readonly DeckLineEvent[],
): DeckLineEvent[] {
  return mergeSyncedEvents(local, remote);
}

export function buildDeckLineKey(side: DeckLineSide, movesUci: readonly string[]): string {
  return [side, movesUci.join(MOVE_SEPARATOR)].join(LINE_KEY_SEPARATOR);
}
