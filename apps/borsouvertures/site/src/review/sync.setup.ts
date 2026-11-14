import type { DeckLineEvent } from '@domain/deck-line-event.core';
import type { ReviewEvent } from '@domain/review-event.core';
import type { SyncedEvent } from '@domain/synced-event.core';
import { QueryObserver } from '@tanstack/react-query';
import { api } from '@/lib/api.client';
import type { EventLog, EventLogMerge } from '@/lib/event-log.store';
import { accountSessionQuery } from '@/lib/queries/account.queries';
import { queryClient } from '@/lib/query-client.setup';
import { recordProductEvent, reportTaggedError } from '@/observability/error-reporting.adapter';
import {
  mergeIntoDeckLineLog,
  readDeckLineLog,
  readDeckLineLogRequest,
  subscribeToDeckLineLog,
} from '@/personal-deck/deck-line-log.store';
import {
  mergeIntoReviewLog,
  readReviewLog,
  readReviewLogRequest,
  subscribeToReviewLog,
} from './review-log.store';
import {
  type PullResult,
  type PushResult,
  pullDeckLineEvents,
  pullReviewEvents,
  pushDeckLineEvents,
  pushReviewEvents,
  type SyncFailure,
} from './sync.adapter';
import {
  advanceCursor,
  applyPushReceipt,
  hasUnpushedEvents,
  isAnotherRoundNeeded,
  isPulledPageDurable,
  isSessionEnded,
  selectSyncStatus,
  selectUnpushedEvents,
} from './sync.core';
import {
  DECK_LINE_SYNC_CURSOR_STORAGE_KEY,
  readSyncCursor,
  SYNC_CURSOR_STORAGE_KEY,
  type SyncCursorStorage,
  writeSyncCursor,
} from './sync-cursor.utils';
import { readSyncStatus, replaceSyncStatus } from './sync.store';

interface ExchangedRound {
  readonly failure: null;
  readonly pushed: number;
  readonly pulled: number;
  readonly hasMore: boolean;
}

interface FailedRound {
  readonly failure: SyncFailure;
}

interface SyncStream<Event extends SyncedEvent> {
  readonly readLog: () => EventLog<Event>;
  readonly mergeInto: (events: readonly Event[]) => Promise<EventLogMerge>;
  readonly push: (events: readonly Event[]) => Promise<PushResult>;
  readonly pull: (cursor: string | null) => Promise<PullResult<Event>>;
  readonly cursorKey: string;
}

const NOTHING_TO_PUSH: PushResult = { outcome: 'synced', receipts: [] };
const SIGNED_OUT = { signedIn: false };

const run = { isRunning: false, isRerunRequested: false };

const sessionCursorByKey = new Map<string, string | null>();

const REVIEW_STREAM: SyncStream<ReviewEvent> = {
  readLog: readReviewLog,
  mergeInto: mergeIntoReviewLog,
  push: async (events) => await pushReviewEvents(api, events),
  pull: async (cursor) => await pullReviewEvents(api, cursor),
  cursorKey: SYNC_CURSOR_STORAGE_KEY,
};

const DECK_LINE_STREAM: SyncStream<DeckLineEvent> = {
  readLog: readDeckLineLog,
  mergeInto: mergeIntoDeckLineLog,
  push: async (events) => await pushDeckLineEvents(api, events),
  pull: async (cursor) => await pullDeckLineEvents(api, cursor),
  cursorKey: DECK_LINE_SYNC_CURSOR_STORAGE_KEY,
};

function readCursorStorage(): SyncCursorStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isOperatorSignedIn(): boolean {
  return queryClient.getQueryData(accountSessionQuery.queryKey)?.signedIn === true;
}

async function pushUnlessEmpty<Event extends SyncedEvent>(
  stream: SyncStream<Event>,
  unpushed: readonly Event[],
): Promise<PushResult> {
  if (unpushed.length === 0) return NOTHING_TO_PUSH;
  return await stream.push(unpushed);
}

async function exchangeOneRound<Event extends SyncedEvent>(
  stream: SyncStream<Event>,
): Promise<ExchangedRound | FailedRound> {
  const unpushed = selectUnpushedEvents(stream.readLog().events);
  const push = await pushUnlessEmpty(stream, unpushed);
  if (push.outcome !== 'synced') return { failure: push };
  const stamped = applyPushReceipt(unpushed, push.receipts);
  await stream.mergeInto(stamped);
  const storage = readCursorStorage();
  const cursor =
    sessionCursorByKey.get(stream.cursorKey) ?? readSyncCursor(storage, stream.cursorKey);
  const pull = await stream.pull(cursor);
  if (pull.outcome !== 'synced') return { failure: pull };
  const merge = await stream.mergeInto(pull.events);
  const nextCursor = advanceCursor(cursor, pull.nextCursor);
  sessionCursorByKey.set(stream.cursorKey, nextCursor);
  const isDurable = isPulledPageDurable(merge, stream.readLog().isProgressKept);
  if (isDurable) writeSyncCursor(storage, nextCursor, stream.cursorKey);
  return {
    failure: null,
    pushed: stamped.length,
    pulled: pull.events.length,
    hasMore: pull.hasMore,
  };
}

async function exchangeBothStreams(): Promise<ExchangedRound | FailedRound> {
  const reviews = await exchangeOneRound(REVIEW_STREAM);
  if (reviews.failure !== null) return reviews;
  const deckLines = await exchangeOneRound(DECK_LINE_STREAM);
  if (deckLines.failure !== null) return deckLines;
  return {
    failure: null,
    pushed: reviews.pushed + deckLines.pushed,
    pulled: reviews.pulled + deckLines.pulled,
    hasMore: reviews.hasMore || deckLines.hasMore,
  };
}

function countUnpushedEvents(): number {
  return (
    selectUnpushedEvents(readReviewLog().events).length +
    selectUnpushedEvents(readDeckLineLog().events).length
  );
}

function settleFailure(failure: SyncFailure): void {
  replaceSyncStatus(selectSyncStatus(failure.outcome, readSyncStatus()));
  const rejection = 'error' in failure ? failure.error : null;
  if (rejection !== null) reportTaggedError(rejection, rejection.tags);
  const isSignedOut = isSessionEnded(failure.outcome);
  if (isSignedOut) queryClient.setQueryData(accountSessionQuery.queryKey, SIGNED_OUT);
}

async function runSync(): Promise<void> {
  await Promise.all([readReviewLogRequest(), readDeckLineLogRequest()]);
  const totals = { pushed: 0, pulled: 0, roundsRun: 0 };
  let isAnotherRound = true;
  while (isAnotherRound) {
    run.isRerunRequested = false;
    const round = await exchangeBothStreams();
    if (round.failure !== null) {
      settleFailure(round.failure);
      return;
    }
    totals.pushed += round.pushed;
    totals.pulled += round.pulled;
    totals.roundsRun += 1;
    isAnotherRound = isAnotherRoundNeeded({
      roundsRun: totals.roundsRun,
      unpushedLeft: countUnpushedEvents(),
      hasMore: round.hasMore,
      isRerunRequested: run.isRerunRequested,
    });
  }
  replaceSyncStatus('synced');
  recordProductEvent({ name: 'sync_completed', pushed: totals.pushed, pulled: totals.pulled });
}

function finishRun(): void {
  run.isRunning = false;
}

export function requestSync(): void {
  const isSignedIn = isOperatorSignedIn();
  if (!isSignedIn) return;
  if (run.isRunning) {
    run.isRerunRequested = true;
    return;
  }
  run.isRunning = true;
  void runSync().finally(finishRun);
}

function requestSyncOfUnpushedEvents(): void {
  const isPushNeeded =
    hasUnpushedEvents(readReviewLog().events) || hasUnpushedEvents(readDeckLineLog().events);
  if (isPushNeeded) requestSync();
}

function requestSyncWhenVisible(): void {
  const isVisible = document.visibilityState === 'visible';
  if (isVisible) requestSync();
}

const sessionObserver = new QueryObserver(queryClient, { ...accountSessionQuery, enabled: false });

// @FollowsBlueprint browser-edge-module
sessionObserver.subscribe(requestSync);
subscribeToReviewLog(requestSyncOfUnpushedEvents);
subscribeToDeckLineLog(requestSyncOfUnpushedEvents);
window.addEventListener('online', requestSync);
document.addEventListener('visibilitychange', requestSyncWhenVisible);
