import { DECK_LINE_EVENT_BATCH_LIMIT, type DeckLineEvent } from '@domain/deck-line-event.core';
import {
  buildPulledPage,
  parsePullCursor,
  projectPushReceipts,
  type PulledPage,
  type PushReceipt,
  selectPullFloor,
} from '../helpers/pull-cursor/pull-cursor.core';
import { buildDeckLineEventRow, projectDeckLineEvent } from './deck-line-events.core';
import {
  insertDeckLineEventsUnlessStored,
  listDeckLineEventsAfter,
  listDeckLineReceivedAtByIds,
} from './deck-line-events.repository';

const ONE_ROW_BEYOND_THE_PAGE = 1;

export interface StoreDeckLineEventsParams {
  readonly events: readonly DeckLineEvent[];
  readonly now: Date;
}

// @FollowsBlueprint service-clock-injected
export async function storeDeckLineEvents(
  params: StoreDeckLineEventsParams,
): Promise<PushReceipt[]> {
  if (params.events.length === 0) return [];
  await insertDeckLineEventsUnlessStored(
    params.events.map((event) => buildDeckLineEventRow(event, params.now)),
  );
  return projectPushReceipts(
    await listDeckLineReceivedAtByIds(params.events.map((event) => event.id)),
  );
}

// @FollowsBlueprint service-orchestration
export async function readDeckLineEventsPage(
  after: string | undefined,
): Promise<PulledPage<DeckLineEvent>> {
  const cursor = parsePullCursor(after);
  const rows = await listDeckLineEventsAfter(
    selectPullFloor(cursor),
    DECK_LINE_EVENT_BATCH_LIMIT + ONE_ROW_BEYOND_THE_PAGE,
  );
  return buildPulledPage(rows, DECK_LINE_EVENT_BATCH_LIMIT, cursor, projectDeckLineEvent);
}
