import type { DeckLineEvent } from '@domain/deck-line-event.core';
import type { ReviewEvent } from '@domain/review-event.core';
import type { ApiClient } from '@/lib/api.client';
import {
  decideSyncOutcome,
  type PushReceipt,
  readPulledDeckLinePage,
  readPulledPage,
  readPushReceipts,
  type SyncOutcome,
} from './sync.core';

export type SyncRoute =
  | 'POST /api/review-events'
  | 'GET /api/review-events'
  | 'POST /api/deck-line-events'
  | 'GET /api/deck-line-events';

const PUSH_ROUTE: SyncRoute = 'POST /api/review-events';
const PULL_ROUTE: SyncRoute = 'GET /api/review-events';
const DECK_LINE_PUSH_ROUTE: SyncRoute = 'POST /api/deck-line-events';
const DECK_LINE_PULL_ROUTE: SyncRoute = 'GET /api/deck-line-events';

export class SyncRejectedError extends Error {
  readonly tags: { status: string; route: SyncRoute };

  constructor(status: number, route: SyncRoute) {
    super(`The API refused the synced events with ${String(status)} on ${route}.`);
    this.name = 'SyncRejectedError';
    this.tags = { status: String(status), route };
  }
}

export type SyncFailure =
  | { readonly outcome: 'signed-out' | 'offline' }
  | { readonly outcome: 'rejected'; readonly error: SyncRejectedError };

export type PushResult =
  | { readonly outcome: 'synced'; readonly receipts: readonly PushReceipt[] }
  | SyncFailure;

export type PullResult<Event = ReviewEvent> =
  | {
      readonly outcome: 'synced';
      readonly events: readonly Event[];
      readonly nextCursor: string | null;
      readonly hasMore: boolean;
    }
  | SyncFailure;

interface AnsweredRequest {
  readonly status: number;
  readonly json: () => Promise<unknown>;
}

type Answer<Body> = { readonly outcome: 'synced'; readonly body: Body } | SyncFailure;

const FAILURE_BY_OUTCOME: Readonly<
  Record<Exclude<SyncOutcome, 'synced' | 'rejected'>, SyncFailure>
> = {
  'signed-out': { outcome: 'signed-out' },
  offline: { outcome: 'offline' },
};

async function readAnswer<Body>(
  send: () => Promise<AnsweredRequest>,
  route: SyncRoute,
  readBody: (body: unknown) => Body | null,
): Promise<Answer<Body>> {
  try {
    const response = await send();
    const outcome = decideSyncOutcome(response.status);
    if (outcome === 'rejected') {
      return { outcome, error: new SyncRejectedError(response.status, route) };
    }
    if (outcome !== 'synced') return FAILURE_BY_OUTCOME[outcome];
    const body = readBody(await response.json());
    if (body === null) return FAILURE_BY_OUTCOME.offline;
    return { outcome, body };
  } catch {
    return FAILURE_BY_OUTCOME.offline;
  }
}

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export async function pushReviewEvents(
  client: ApiClient,
  events: readonly ReviewEvent[],
): Promise<PushResult> {
  const answer = await readAnswer(
    () => client.api['review-events'].$post({ json: { events: [...events] } }),
    PUSH_ROUTE,
    readPushReceipts,
  );
  if (answer.outcome !== 'synced') return answer;
  return { outcome: 'synced', receipts: answer.body };
}

export async function pullReviewEvents(
  client: ApiClient,
  cursor: string | null,
): Promise<PullResult> {
  const answer = await readAnswer(
    () => client.api['review-events'].$get({ query: cursor === null ? {} : { after: cursor } }),
    PULL_ROUTE,
    readPulledPage,
  );
  if (answer.outcome !== 'synced') return answer;
  return { outcome: 'synced', ...answer.body };
}

export async function pushDeckLineEvents(
  client: ApiClient,
  events: readonly DeckLineEvent[],
): Promise<PushResult> {
  const answer = await readAnswer(
    () => client.api['deck-line-events'].$post({ json: { events: [...events] } }),
    DECK_LINE_PUSH_ROUTE,
    readPushReceipts,
  );
  if (answer.outcome !== 'synced') return answer;
  return { outcome: 'synced', receipts: answer.body };
}

export async function pullDeckLineEvents(
  client: ApiClient,
  cursor: string | null,
): Promise<PullResult<DeckLineEvent>> {
  const answer = await readAnswer(
    () => client.api['deck-line-events'].$get({ query: cursor === null ? {} : { after: cursor } }),
    DECK_LINE_PULL_ROUTE,
    readPulledDeckLinePage,
  );
  if (answer.outcome !== 'synced') return answer;
  return { outcome: 'synced', ...answer.body };
}
