import { deriveCalendarDay } from '@domain/calendar-day.core';
import { buildMoveCardId, type ReviewEvent, type ReviewOutcome } from '@domain/review-event.core';

export const FIXTURE_OPERATOR_PASSWORD = 'albin-countergambit-fixture';
export const FIXTURE_SIGNING_KEY = Buffer.from(
  'borsouvertures fixture signing key, public on purpose',
).toString('base64');
export const FIXTURE_DECK_ID = 'albin-countergambit';
export const FIXTURE_DEVICE_ID = '0f1e2d3c-0000-4000-8000-00000000d0d0';
export const FIXTURE_FIRST_SESSION_EPOCH = 1;

export const FIXTURE_POSITION_KEYS = [
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -',
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -',
  'rnbqkbnr/ppp2ppp/8/3pP3/2P5/8/PP2PPPP/RNBQKBNR b KQkq -',
  'rnbqkbnr/ppp2ppp/8/4P3/2Pp4/5N2/PP2PPPP/RNBQKB1R b KQkq -',
  'r1bqkbnr/ppp2ppp/2n5/4P3/2Pp4/5NP1/PP2PP1P/RNBQKB1R b KQkq -',
  'r1bqkb1r/ppp1nppp/2n5/4P3/2Pp4/5NP1/PP2PPBP/RNBQK2R b KQkq -',
] as const;

const FIXTURE_DAYS = 14;
const REVIEWS_PER_DAY = 2;
const MISSED_EVERY = 5;
const MILLISECONDS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;
const UTC_OFFSET_MINUTES = 0;
const EVENT_ID_PREFIX = '0f1e2d3c-0000-4000-8000-';
const EVENT_ID_SUFFIX_LENGTH = 12;

function buildFixtureEventId(index: number): string {
  return `${EVENT_ID_PREFIX}${String(index).padStart(EVENT_ID_SUFFIX_LENGTH, '0')}`;
}

function selectFixtureOutcome(index: number): ReviewOutcome {
  return index % MISSED_EVERY === MISSED_EVERY - 1 ? 'missed' : 'recalled';
}

function selectFixturePositionKey(index: number): string {
  return String(FIXTURE_POSITION_KEYS[index % FIXTURE_POSITION_KEYS.length]);
}

function buildFixtureReviewEvent(index: number, now: Date): ReviewEvent {
  const daysAgo = FIXTURE_DAYS - 1 - Math.floor(index / REVIEWS_PER_DAY);
  const hoursAgo = daysAgo * HOURS_PER_DAY + REVIEWS_PER_DAY - (index % REVIEWS_PER_DAY);
  const reviewedAt = new Date(now.getTime() - hoursAgo * MILLISECONDS_PER_HOUR);
  return {
    id: buildFixtureEventId(index),
    cardId: buildMoveCardId(FIXTURE_DECK_ID, selectFixturePositionKey(index)),
    outcome: selectFixtureOutcome(index),
    reviewedAt: reviewedAt.toISOString(),
    calendarDay: deriveCalendarDay(reviewedAt, UTC_OFFSET_MINUTES),
    deviceId: FIXTURE_DEVICE_ID,
    receivedAt: null,
  };
}

// @FollowsBlueprint core-projection
export function buildFixtureReviewEvents(now: Date): ReviewEvent[] {
  return Array.from({ length: FIXTURE_DAYS * REVIEWS_PER_DAY }, (_unused, index) =>
    buildFixtureReviewEvent(index, now),
  );
}
