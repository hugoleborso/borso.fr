import { describe, expect, it } from 'vitest';
import {
  buildPulledPage,
  formatPullCursor,
  parsePullCursor,
  projectPushReceipts,
  PULL_OVERLAP_MS,
  type ReceivedRow,
  selectPullFloor,
} from './pull-cursor.core';

const EVENT_ID = '7d3c1b2a-0000-4000-8000-000000000001';
const SECOND_EVENT_ID = '7d3c1b2a-0000-4000-8000-000000000002';
const RECEIVED_AT = new Date('2026-11-13T10:00:00.000Z');

function buildStoredEvent(id: string): ReceivedRow {
  return { id, receivedAt: RECEIVED_AT };
}

function projectId(row: ReceivedRow): { id: string } {
  return { id: row.id };
}

// @FollowsBlueprint test-pure-unit
describe('parsePullCursor', () => {
  it('reads a page cursor and a resume cursor', () => {
    expect(parsePullCursor(`page~2026-11-13T10:00:00.000Z~${EVENT_ID}`)).toEqual({
      kind: 'page',
      receivedAt: RECEIVED_AT,
      id: EVENT_ID,
    });
    expect(parsePullCursor(`resume~2026-11-13T10:00:00.000Z~${EVENT_ID}`)).toEqual({
      kind: 'resume',
      receivedAt: RECEIVED_AT,
      id: EVENT_ID,
    });
  });

  it('answers null when the query has no cursor, so the pull starts at the beginning', () => {
    expect(parsePullCursor(undefined)).toBeNull();
  });

  it.each([
    ['an unknown kind', `later~2026-11-13T10:00:00.000Z~${EVENT_ID}`],
    ['an instant that is not a date', `page~yesterday~${EVENT_ID}`],
    ['an id that is not a UUID', 'page~2026-11-13T10:00:00.000Z~event-1'],
    ['a fourth part', `page~2026-11-13T10:00:00.000Z~${EVENT_ID}~more`],
    ['two parts only', 'page~2026-11-13T10:00:00.000Z'],
  ])('answers null for %s', (_reason, raw) => {
    expect(parsePullCursor(raw)).toBeNull();
  });
});

describe('formatPullCursor', () => {
  it('writes the text parsePullCursor reads', () => {
    const cursor = { kind: 'resume', receivedAt: RECEIVED_AT, id: EVENT_ID } as const;
    expect(formatPullCursor(cursor)).toBe(`resume~2026-11-13T10:00:00.000Z~${EVENT_ID}`);
    expect(parsePullCursor(formatPullCursor(cursor))).toEqual(cursor);
  });
});

describe('selectPullFloor', () => {
  it('starts before every event when there is no cursor', () => {
    expect(selectPullFloor(null)).toEqual({
      receivedAt: new Date(0),
      id: '00000000-0000-0000-0000-000000000000',
    });
  });

  it('continues strictly after the last event of a page', () => {
    expect(selectPullFloor({ kind: 'page', receivedAt: RECEIVED_AT, id: EVENT_ID })).toEqual({
      receivedAt: RECEIVED_AT,
      id: EVENT_ID,
    });
  });

  it('restarts one minute before a resume cursor, so a late commit is read again', () => {
    expect(PULL_OVERLAP_MS).toBe(60_000);
    expect(selectPullFloor({ kind: 'resume', receivedAt: RECEIVED_AT, id: EVENT_ID })).toEqual({
      receivedAt: new Date('2026-11-13T09:59:00.000Z'),
      id: '00000000-0000-0000-0000-000000000000',
    });
  });
});

describe('projectPushReceipts', () => {
  it('answers each stored id with its stored receivedAt', () => {
    expect(projectPushReceipts([{ id: EVENT_ID, receivedAt: RECEIVED_AT }])).toEqual([
      { id: EVENT_ID, receivedAt: '2026-11-13T10:00:00.000Z' },
    ]);
  });
});

describe('buildPulledPage', () => {
  const PAGE_LIMIT = 1;

  it('answers a page cursor and hasMore when a row lies beyond the limit', () => {
    const page = buildPulledPage(
      [buildStoredEvent(EVENT_ID), buildStoredEvent(SECOND_EVENT_ID)],
      PAGE_LIMIT,
      null,
      projectId,
    );
    expect(page.events.map((event) => event.id)).toEqual([EVENT_ID]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe(`page~2026-11-13T10:00:00.000Z~${EVENT_ID}`);
  });

  it('answers a resume cursor on the last row when the page holds the end', () => {
    const page = buildPulledPage([buildStoredEvent(EVENT_ID)], PAGE_LIMIT, null, projectId);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBe(`resume~2026-11-13T10:00:00.000Z~${EVENT_ID}`);
  });

  it('turns the cursor it was given into a resume cursor when nothing is new', () => {
    const page = buildPulledPage(
      [],
      PAGE_LIMIT,
      {
        kind: 'page',
        receivedAt: RECEIVED_AT,
        id: EVENT_ID,
      },
      projectId,
    );
    expect(page).toEqual({
      events: [],
      nextCursor: `resume~2026-11-13T10:00:00.000Z~${EVENT_ID}`,
      hasMore: false,
    });
  });

  it('answers no cursor when the account holds no event yet', () => {
    expect(buildPulledPage([], PAGE_LIMIT, null, projectId)).toEqual({
      events: [],
      nextCursor: null,
      hasMore: false,
    });
  });
});
