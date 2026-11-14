/**
 * @vitest-environment node
 */

import { readFileSync } from 'node:fs';
import { derivePositionKey } from '@domain/position-key.core';
import { listValidReviewEvents } from '@domain/review-event.core';
import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildFixtureReviewEvents,
  FIXTURE_DECK_ID,
  FIXTURE_DEVICE_ID,
  FIXTURE_POSITION_KEYS,
} from './test-seed-fixture.core';

const NOW = new Date('2026-11-13T12:00:00.000Z');
const MILLISECONDS_PER_HOUR = 3_600_000;

const deckFileSchema = z.object({
  id: z.string(),
  side: z.enum(['white', 'black']),
  lines: z.array(z.object({ movesSan: z.array(z.string()) })).min(1),
});

function readFixtureDeck() {
  const path = new URL(`../../../content/decks/${FIXTURE_DECK_ID}/deck.json`, import.meta.url);
  return deckFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

function listReaderPositionKeys(movesSan: readonly string[], count: number): string[] {
  const board = new Chess();
  const keys: string[] = [];
  for (const san of movesSan) {
    board.move(san);
    if (board.turn() === 'b') keys.push(derivePositionKey(board.fen()));
  }
  return keys.slice(0, count);
}

// @FollowsBlueprint test-pure-unit
describe('the fixture position keys', () => {
  it('are the first reader positions of the first line of the Albin deck', () => {
    const deck = readFixtureDeck();
    expect(deck.id).toBe(FIXTURE_DECK_ID);
    expect(deck.side).toBe('black');
    expect(
      listReaderPositionKeys(deck.lines[0]?.movesSan ?? [], FIXTURE_POSITION_KEYS.length),
    ).toEqual([...FIXTURE_POSITION_KEYS]);
  });
});

describe('buildFixtureReviewEvents', () => {
  it('builds two valid review events a day over fourteen days, all from one device', () => {
    const events = buildFixtureReviewEvents(NOW);
    expect(events).toHaveLength(28);
    expect(listValidReviewEvents(events)).toEqual(events);
    expect(new Set(events.map((event) => event.calendarDay)).size).toBe(14);
    expect(events.every((event) => event.deviceId === FIXTURE_DEVICE_ID)).toBe(true);
    expect(events.every((event) => event.receivedAt === null)).toBe(true);
  });

  it('keeps the same ids at every seed, so a second seed stores nothing new', () => {
    const events = buildFixtureReviewEvents(NOW);
    expect(events[0]?.id).toBe('0f1e2d3c-0000-4000-8000-000000000000');
    expect(events[27]?.id).toBe('0f1e2d3c-0000-4000-8000-000000000027');
    expect(buildFixtureReviewEvents(new Date(0)).map((event) => event.id)).toEqual(
      events.map((event) => event.id),
    );
  });

  it('runs from thirteen days ago to an hour before now, oldest first', () => {
    const events = buildFixtureReviewEvents(NOW);
    expect(events[0]?.reviewedAt).toBe(
      new Date(NOW.getTime() - (13 * 24 + 2) * MILLISECONDS_PER_HOUR).toISOString(),
    );
    expect(events[1]?.reviewedAt).toBe(
      new Date(NOW.getTime() - (13 * 24 + 1) * MILLISECONDS_PER_HOUR).toISOString(),
    );
    expect(events[27]?.reviewedAt).toBe(
      new Date(NOW.getTime() - MILLISECONDS_PER_HOUR).toISOString(),
    );
    expect(events[0]?.calendarDay).toBe('2026-10-31');
    expect(events[27]?.calendarDay).toBe('2026-11-13');
  });

  it('misses every fifth review and recalls the others', () => {
    const events = buildFixtureReviewEvents(NOW);
    expect(events.slice(0, 5).map((event) => event.outcome)).toEqual([
      'recalled',
      'recalled',
      'recalled',
      'recalled',
      'missed',
    ]);
  });

  it('cycles through the fixture positions of the Albin deck', () => {
    const events = buildFixtureReviewEvents(NOW);
    expect(events[0]?.cardId).toBe(`move:${FIXTURE_DECK_ID}:${FIXTURE_POSITION_KEYS[0]}`);
    expect(events[7]?.cardId).toBe(`move:${FIXTURE_DECK_ID}:${FIXTURE_POSITION_KEYS[1]}`);
  });
});
