import type { ReviewEvent } from '@domain/review-event.core';
import { QueryObserver } from '@tanstack/react-query';
import { api } from '@/lib/api.client';
import { accountSessionQuery } from '@/lib/queries/account.queries';
import { queryClient } from '@/lib/query-client.setup';
import { recordProductEvent, reportTaggedError } from '@/observability/error-reporting.adapter';
import {
  mergeIntoReviewLog,
  readReviewLog,
  readReviewLogRequest,
  subscribeToReviewLog,
} from './review-log.store';
import {
  type PushResult,
  pullReviewEvents,
  pushReviewEvents,
  type SyncFailure,
} from './sync.adapter';
import {
  advanceCursor,
  applyPushReceipt,
  hasUnpushedEvents,
  isAnotherRoundNeeded,
  isSessionEnded,
  selectSyncStatus,
  selectUnpushedEvents,
} from './sync.core';
import { readSyncCursor, type SyncCursorStorage, writeSyncCursor } from './sync-cursor.utils';
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

const NOTHING_TO_PUSH: PushResult = { outcome: 'synced', receipts: [] };
const SIGNED_OUT = { signedIn: false };

const run = { isRunning: false, isRerunRequested: false };

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

async function pushUnlessEmpty(unpushed: readonly ReviewEvent[]): Promise<PushResult> {
  if (unpushed.length === 0) return NOTHING_TO_PUSH;
  return await pushReviewEvents(api, unpushed);
}

async function exchangeOneRound(): Promise<ExchangedRound | FailedRound> {
  const unpushed = selectUnpushedEvents(readReviewLog().events);
  const push = await pushUnlessEmpty(unpushed);
  if (push.outcome !== 'synced') return { failure: push };
  const stamped = applyPushReceipt(unpushed, push.receipts);
  await mergeIntoReviewLog(stamped);
  const storage = readCursorStorage();
  const cursor = readSyncCursor(storage);
  const pull = await pullReviewEvents(api, cursor);
  if (pull.outcome !== 'synced') return { failure: pull };
  const isPulledPageStored = (await mergeIntoReviewLog(pull.events)) === 'stored';
  if (isPulledPageStored) writeSyncCursor(storage, advanceCursor(cursor, pull.nextCursor));
  return {
    failure: null,
    pushed: stamped.length,
    pulled: pull.events.length,
    hasMore: isPulledPageStored && pull.hasMore,
  };
}

function settleFailure(failure: SyncFailure): void {
  replaceSyncStatus(selectSyncStatus(failure.outcome, readSyncStatus()));
  const rejection = 'error' in failure ? failure.error : null;
  if (rejection !== null) reportTaggedError(rejection, rejection.tags);
  const isSignedOut = isSessionEnded(failure.outcome);
  if (isSignedOut) queryClient.setQueryData(accountSessionQuery.queryKey, SIGNED_OUT);
}

async function runSync(): Promise<void> {
  await readReviewLogRequest();
  const totals = { pushed: 0, pulled: 0, roundsRun: 0 };
  let isAnotherRound = true;
  while (isAnotherRound) {
    run.isRerunRequested = false;
    const round = await exchangeOneRound();
    if (round.failure !== null) {
      settleFailure(round.failure);
      return;
    }
    totals.pushed += round.pushed;
    totals.pulled += round.pulled;
    totals.roundsRun += 1;
    isAnotherRound = isAnotherRoundNeeded({
      roundsRun: totals.roundsRun,
      unpushedLeft: selectUnpushedEvents(readReviewLog().events).length,
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
  const isPushNeeded = hasUnpushedEvents(readReviewLog().events);
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
window.addEventListener('online', requestSync);
document.addEventListener('visibilitychange', requestSyncWhenVisible);
