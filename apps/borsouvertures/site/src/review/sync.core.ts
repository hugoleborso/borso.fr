import { type DeckLineEvent, listValidDeckLineEvents } from '@domain/deck-line-event.core';
import {
  listValidReviewEvents,
  REVIEW_EVENT_BATCH_LIMIT,
  type ReviewEvent,
} from '@domain/review-event.core';
import type { SyncedEvent } from '@domain/synced-event.core';
import type { InferResponseType } from 'hono/client';
import { z } from 'zod';
import type { ApiClient } from '@/lib/api.client';

export type SyncOutcome = 'synced' | 'signed-out' | 'rejected' | 'offline';

export type SyncStatus = 'idle' | 'synced' | 'paused' | 'expired';

export type PushReceipt = Readonly<
  InferResponseType<ApiClient['api']['review-events']['$post'], 200>['accepted'][number]
>;

export interface PulledEventsPage<Event> {
  readonly events: readonly Event[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface SyncRound {
  readonly roundsRun: number;
  readonly unpushedLeft: number;
  readonly hasMore: boolean;
  readonly isRerunRequested: boolean;
}

export const MAX_ROUNDS_PER_SYNC = 20;

const UNAUTHORIZED_STATUS = 401;
const LOWEST_SUCCESS_STATUS = 200;
const LOWEST_REDIRECT_STATUS = 300;
const LOWEST_CLIENT_ERROR_STATUS = 400;
const LOWEST_SERVER_ERROR_STATUS = 500;

const STATUS_BY_OUTCOME: Readonly<Record<Exclude<SyncOutcome, 'offline'>, SyncStatus>> = {
  synced: 'synced',
  'signed-out': 'expired',
  rejected: 'paused',
};

function isInRange(status: number, lowest: number, beyond: number): boolean {
  return status >= lowest && status < beyond;
}

// @FollowsBlueprint core-decision
export function decideSyncOutcome(status: number): SyncOutcome {
  if (isInRange(status, LOWEST_SUCCESS_STATUS, LOWEST_REDIRECT_STATUS)) return 'synced';
  if (status === UNAUTHORIZED_STATUS) return 'signed-out';
  if (isInRange(status, LOWEST_CLIENT_ERROR_STATUS, LOWEST_SERVER_ERROR_STATUS)) return 'rejected';
  return 'offline';
}

export function selectUnpushedEvents<Event extends SyncedEvent>(
  events: readonly Event[],
  limit: number = REVIEW_EVENT_BATCH_LIMIT,
): Event[] {
  return events.filter((event) => event.receivedAt === null).slice(0, limit);
}

export function applyPushReceipt<Event extends SyncedEvent>(
  pushed: readonly Event[],
  receipts: readonly PushReceipt[],
): Event[] {
  const receivedAtById = new Map(receipts.map((receipt) => [receipt.id, receipt.receivedAt]));
  return pushed.flatMap((event) => {
    const receivedAt = receivedAtById.get(event.id);
    return receivedAt === undefined ? [] : [{ ...event, receivedAt }];
  });
}

export function advanceCursor(current: string | null, next: string | null): string | null {
  return next ?? current;
}

export function isPulledPageDurable(
  merge: 'stored' | 'in-memory-only',
  isProgressKept: boolean,
): boolean {
  return merge === 'stored' && isProgressKept;
}

export function isAnotherRoundNeeded(round: SyncRound): boolean {
  const isWorkLeft = round.unpushedLeft > 0 || round.hasMore || round.isRerunRequested;
  return isWorkLeft && round.roundsRun < MAX_ROUNDS_PER_SYNC;
}

export function hasUnpushedEvents(events: readonly SyncedEvent[]): boolean {
  return events.some((event) => event.receivedAt === null);
}

export function isSessionEnded(outcome: SyncOutcome): boolean {
  return outcome === 'signed-out';
}

export function isSessionExpiryShown(
  status: SyncStatus,
  session: { readonly signedIn: boolean } | undefined,
): boolean {
  return status === 'expired' && session?.signedIn === false;
}

export function selectSyncStatus(outcome: SyncOutcome, previous: SyncStatus): SyncStatus {
  return outcome === 'offline' ? previous : STATUS_BY_OUTCOME[outcome];
}

const pushAnswerSchema = z.object({
  accepted: z.array(z.unknown()),
});

const pushReceiptSchema = z.object({ id: z.string(), receivedAt: z.string() });

const pulledPageSchema = z.object({
  events: z.array(z.unknown()),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

function readPushReceipt(value: unknown): PushReceipt[] {
  const receipt = pushReceiptSchema.safeParse(value);
  return receipt.success ? [receipt.data] : [];
}

export function readPushReceipts(body: unknown): PushReceipt[] | null {
  const answer = pushAnswerSchema.safeParse(body);
  if (!answer.success) return null;
  return answer.data.accepted.flatMap((value) => readPushReceipt(value));
}

function readPulledEventsPage<Event extends SyncedEvent>(
  body: unknown,
  listValid: (values: readonly unknown[]) => Event[],
): PulledEventsPage<Event> | null {
  const page = pulledPageSchema.safeParse(body);
  if (!page.success) return null;
  const events = listValid(page.data.events).filter((event) => event.receivedAt !== null);
  return { events, nextCursor: page.data.nextCursor, hasMore: page.data.hasMore };
}

export function readPulledPage(body: unknown): PulledEventsPage<ReviewEvent> | null {
  return readPulledEventsPage(body, listValidReviewEvents);
}

export function readPulledDeckLinePage(body: unknown): PulledEventsPage<DeckLineEvent> | null {
  return readPulledEventsPage(body, listValidDeckLineEvents);
}
