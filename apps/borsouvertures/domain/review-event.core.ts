import { type CalendarDay, isCalendarDay } from './calendar-day.core';
import { isPositionKey, type PositionKey } from './position-key.core';
import {
  isEventRecord,
  mergeSyncedEvents,
  parseInstant,
  parseReceivedAt,
  parseUuid,
  selectEarliestInstant,
  sortByInstantThenId,
} from './synced-event.core';

export type CardKind = 'move' | 'name' | 'trap';
export type ReviewOutcome = 'recalled' | 'missed';
export type CardId = string;

export interface ReviewEvent {
  id: string;
  cardId: CardId;
  outcome: ReviewOutcome;
  reviewedAt: string;
  calendarDay: CalendarDay;
  deviceId: string;
  receivedAt: string | null;
}

interface ParsedCardId {
  kind: CardKind;
  deckId: string | null;
  subject: string;
}

export const REVIEW_EVENT_BATCH_LIMIT = 500;

const CARD_ID_SEPARATOR = ':';
const MOVE_CARD_PATTERN = /^move:([0-9a-z]+(?:-[0-9a-z]+)*):([^:]+)$/;
const NAME_CARD_PATTERN = /^name:([^:]+)$/;
const TRAP_CARD_PATTERN = /^trap:([0-9A-Za-z]+)$/;

// @FollowsBlueprint domain-shared-selection
export function buildMoveCardId(deckId: string, positionKey: PositionKey): CardId {
  return ['move', deckId, positionKey].join(CARD_ID_SEPARATOR);
}

function parseMoveCardId(value: string): ParsedCardId | null {
  const match = MOVE_CARD_PATTERN.exec(value);
  const subject = String(match?.[2]);
  if (!isPositionKey(subject)) return null;
  return { kind: 'move', deckId: String(match?.[1]), subject };
}

function parseNameCardId(value: string): ParsedCardId | null {
  const subject = String(NAME_CARD_PATTERN.exec(value)?.[1]);
  if (!isPositionKey(subject)) return null;
  return { kind: 'name', deckId: null, subject };
}

function parseTrapCardId(value: string): ParsedCardId | null {
  const subject = TRAP_CARD_PATTERN.exec(value)?.[1];
  if (subject === undefined) return null;
  return { kind: 'trap', deckId: null, subject };
}

export function parseCardId(value: string): ParsedCardId | null {
  return parseMoveCardId(value) ?? parseNameCardId(value) ?? parseTrapCardId(value);
}

function parseKnownCardId(value: unknown): CardId | null {
  const text = String(value);
  return text === value && parseCardId(text) !== null ? text : null;
}

function parseOutcome(value: unknown): ReviewOutcome | null {
  return value === 'recalled' || value === 'missed' ? value : null;
}

function parseDay(value: unknown): CalendarDay | null {
  const text = String(value);
  return text === value && isCalendarDay(text) ? text : null;
}

export function parseReviewEvent(value: unknown): ReviewEvent | null {
  if (!isEventRecord(value)) return null;
  const id = parseUuid(value.id);
  const cardId = parseKnownCardId(value.cardId);
  const outcome = parseOutcome(value.outcome);
  const reviewedAt = parseInstant(value.reviewedAt);
  const calendarDay = parseDay(value.calendarDay);
  const deviceId = parseUuid(value.deviceId);
  const receivedAt = parseReceivedAt(value.receivedAt);
  if (
    id === null ||
    cardId === null ||
    outcome === null ||
    reviewedAt === null ||
    calendarDay === null ||
    deviceId === null ||
    receivedAt === undefined
  ) {
    return null;
  }
  return { id, cardId, outcome, reviewedAt, calendarDay, deviceId, receivedAt };
}

export function listValidReviewEvents(values: readonly unknown[]): ReviewEvent[] {
  return values
    .map((value) => parseReviewEvent(value))
    .filter((event): event is ReviewEvent => event !== null);
}

export function selectReplayInstant(event: ReviewEvent, now: Date): Date {
  return selectEarliestInstant(event, event.reviewedAt, now);
}

export function listReviewEventsInReplayOrder(
  events: readonly ReviewEvent[],
  now: Date,
): ReviewEvent[] {
  return sortByInstantThenId(events, (event) => selectReplayInstant(event, now));
}

export function mergeReviewEvents(
  local: readonly ReviewEvent[],
  remote: readonly ReviewEvent[],
): ReviewEvent[] {
  return mergeSyncedEvents(local, remote);
}
