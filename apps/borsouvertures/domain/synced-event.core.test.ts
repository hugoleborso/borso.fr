import { describe, expect, it } from 'vitest';
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

const FIRST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const SECOND_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002';
const NOW = new Date('2026-02-01T12:00:00.000Z');

function disguise(text: string): { toString: () => string } {
  return { toString: () => text };
}

// @FollowsBlueprint test-pure-unit
describe('the synced event parsers', () => {
  it('reads a plain record and nothing else', () => {
    expect(isEventRecord({})).toBe(true);
    expect(isEventRecord(null)).toBe(false);
    expect(isEventRecord([])).toBe(false);
    expect(isEventRecord('text')).toBe(false);
  });

  it('reads a UUID string, in either case, and refuses an object that prints as one', () => {
    expect(parseUuid(FIRST_ID)).toBe(FIRST_ID);
    expect(parseUuid(FIRST_ID.toUpperCase())).toBe(FIRST_ID.toUpperCase());
    expect(parseUuid(disguise(FIRST_ID))).toBeNull();
    expect(parseUuid(`${FIRST_ID}0`)).toBeNull();
    expect(parseUuid(`0${FIRST_ID}`)).toBeNull();
  });

  it('reads an instant string, and refuses an object that prints as one', () => {
    expect(parseInstant('2026-02-01T12:00:00.000Z')).toBe('2026-02-01T12:00:00.000Z');
    expect(parseInstant('yesterday')).toBeNull();
    expect(parseInstant(disguise('2026-02-01T12:00:00.000Z'))).toBeNull();
  });

  it('reads a received instant as null before the server stamps it, and refuses anything else', () => {
    expect(parseReceivedAt(null)).toBeNull();
    expect(parseReceivedAt('2026-02-01T12:00:00.000Z')).toBe('2026-02-01T12:00:00.000Z');
    expect(parseReceivedAt('later')).toBeUndefined();
    expect(parseReceivedAt(undefined)).toBeUndefined();
  });
});

describe('the replay instant and order', () => {
  it('takes the earliest of the device instant, the server instant and now', () => {
    const event = { id: FIRST_ID, receivedAt: '2026-01-10T09:00:00.000Z' };
    expect(selectEarliestInstant(event, '2026-01-10T08:00:00.000Z', NOW).toISOString()).toBe(
      '2026-01-10T08:00:00.000Z',
    );
    expect(selectEarliestInstant(event, '2026-01-10T10:00:00.000Z', NOW).toISOString()).toBe(
      '2026-01-10T09:00:00.000Z',
    );
    expect(
      selectEarliestInstant({ id: FIRST_ID, receivedAt: null }, '2027-01-01T00:00:00.000Z', NOW),
    ).toEqual(NOW);
  });

  it('sorts by instant, then by id when two instants are equal', () => {
    const instants: Record<string, string> = {
      [FIRST_ID]: '2026-01-10T08:00:00.000Z',
      [SECOND_ID]: '2026-01-09T08:00:00.000Z',
    };
    const first = { id: FIRST_ID, receivedAt: null };
    const second = { id: SECOND_ID, receivedAt: null };
    expect(
      sortByInstantThenId([first, second], (event) => new Date(instants[event.id] ?? '')),
    ).toEqual([second, first]);
    expect(sortByInstantThenId([second, first], () => NOW)).toEqual([first, second]);
  });
});

describe('mergeSyncedEvents', () => {
  it('keeps one event per id, and prefers the copy the server stamped', () => {
    const unstamped: SyncedEvent = { id: FIRST_ID, receivedAt: null };
    const stamped: SyncedEvent = { id: FIRST_ID, receivedAt: '2026-01-10T09:00:00.000Z' };
    const other: SyncedEvent = { id: SECOND_ID, receivedAt: null };
    expect(mergeSyncedEvents([unstamped, other], [stamped])).toEqual([stamped, other]);
    expect(mergeSyncedEvents([stamped], [unstamped])).toEqual([stamped]);
    expect(mergeSyncedEvents([unstamped], [unstamped])).toEqual([unstamped]);
  });
});
