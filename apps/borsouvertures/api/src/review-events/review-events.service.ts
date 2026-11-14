import { REVIEW_EVENT_BATCH_LIMIT, type ReviewEvent } from '@domain/review-event.core';
import type { DatabaseExecutor } from '../database/client';
import {
  buildPulledPage,
  parsePullCursor,
  projectPushReceipts,
  type PulledPage,
  type PushReceipt,
  selectPullFloor,
} from '../helpers/pull-cursor/pull-cursor.core';
import { buildReviewEventRow, projectReviewEvent } from './review-events.core';
import {
  insertReviewEventsUnlessStored,
  listReceivedAtByIds,
  listReviewEventsAfter,
} from './review-events.repository';

const ONE_ROW_BEYOND_THE_PAGE = 1;

export interface StoreReviewEventsParams {
  readonly events: readonly ReviewEvent[];
  readonly now: Date;
}

// @FollowsBlueprint service-clock-injected
export async function storeReviewEvents(params: StoreReviewEventsParams): Promise<PushReceipt[]> {
  if (params.events.length === 0) return [];
  await insertReviewEventsUnlessStored(
    params.events.map((event) => buildReviewEventRow(event, params.now)),
  );
  return projectPushReceipts(await listReceivedAtByIds(params.events.map((event) => event.id)));
}

export async function storeReviewEventsWithin(
  executor: DatabaseExecutor,
  params: StoreReviewEventsParams,
): Promise<void> {
  await insertReviewEventsUnlessStored(
    params.events.map((event) => buildReviewEventRow(event, params.now)),
    executor,
  );
}

// @FollowsBlueprint service-orchestration
export async function readReviewEventsPage(
  after: string | undefined,
): Promise<PulledPage<ReviewEvent>> {
  const cursor = parsePullCursor(after);
  const rows = await listReviewEventsAfter(
    selectPullFloor(cursor),
    REVIEW_EVENT_BATCH_LIMIT + ONE_ROW_BEYOND_THE_PAGE,
  );
  return buildPulledPage(rows, REVIEW_EVENT_BATCH_LIMIT, cursor, projectReviewEvent);
}
