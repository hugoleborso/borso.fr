const CURSOR_SEPARATOR = '~';
const CURSOR_PART_COUNT = 3;
const CURSOR_KINDS = ['page', 'resume'] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOWEST_UUID = '00000000-0000-0000-0000-000000000000';
const MILLISECONDS_PER_MINUTE = 60_000;

export const PULL_OVERLAP_MS = MILLISECONDS_PER_MINUTE;

export type PullCursorKind = (typeof CURSOR_KINDS)[number];

export interface PullCursor {
  readonly kind: PullCursorKind;
  readonly receivedAt: Date;
  readonly id: string;
}

export interface PullFloor {
  readonly receivedAt: Date;
  readonly id: string;
}

export interface ReceivedRow {
  readonly id: string;
  readonly receivedAt: Date;
}

export interface PushReceipt {
  readonly id: string;
  readonly receivedAt: string;
}

export interface PulledPage<Event> {
  readonly events: Event[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

function parseCursorKind(value: string | undefined): PullCursorKind | null {
  return CURSOR_KINDS.find((kind) => kind === value) ?? null;
}

// @FollowsBlueprint core-parse-untrusted
export function parsePullCursor(raw: string | undefined): PullCursor | null {
  if (raw === undefined) return null;
  const parts = raw.split(CURSOR_SEPARATOR);
  const kind = parseCursorKind(parts[0]);
  const receivedAt = new Date(String(parts[1]));
  const id = String(parts[2]);
  if (
    parts.length !== CURSOR_PART_COUNT ||
    kind === null ||
    Number.isNaN(receivedAt.getTime()) ||
    !UUID_PATTERN.test(id)
  ) {
    return null;
  }
  return { kind, receivedAt, id };
}

export function formatPullCursor(cursor: PullCursor): string {
  return [cursor.kind, cursor.receivedAt.toISOString(), cursor.id].join(CURSOR_SEPARATOR);
}

export function selectPullFloor(cursor: PullCursor | null): PullFloor {
  if (cursor === null) return { receivedAt: new Date(0), id: LOWEST_UUID };
  if (cursor.kind === 'page') return { receivedAt: cursor.receivedAt, id: cursor.id };
  return { receivedAt: new Date(cursor.receivedAt.getTime() - PULL_OVERLAP_MS), id: LOWEST_UUID };
}

export function projectPushReceipts(rows: readonly ReceivedRow[]): PushReceipt[] {
  return rows.map((row) => ({ id: row.id, receivedAt: row.receivedAt.toISOString() }));
}

function selectNextCursor(
  lastRow: ReceivedRow | undefined,
  hasMore: boolean,
  cursor: PullCursor | null,
): PullCursor | null {
  if (lastRow !== undefined) {
    return { kind: hasMore ? 'page' : 'resume', receivedAt: lastRow.receivedAt, id: lastRow.id };
  }
  return cursor === null ? null : { ...cursor, kind: 'resume' };
}

export function buildPulledPage<Row extends ReceivedRow, Event>(
  rowsUpToOneBeyondLimit: readonly Row[],
  limit: number,
  cursor: PullCursor | null,
  project: (row: Row) => Event,
): PulledPage<Event> {
  const hasMore = rowsUpToOneBeyondLimit.length > limit;
  const rows = rowsUpToOneBeyondLimit.slice(0, limit);
  const nextCursor = selectNextCursor(rows.at(-1), hasMore, cursor);
  return {
    events: rows.map((row) => project(row)),
    nextCursor: nextCursor === null ? null : formatPullCursor(nextCursor),
    hasMore,
  };
}
