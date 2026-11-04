import { buildStaleMessage, type StaleScope } from '@domain/stale-scope.core';
import { getAppConfig } from '../auth/auth.service';
import type { TaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { postToConnection } from './broadcast.adapter';
import {
  BROADCAST_FAILED,
  type BroadcastOutcome,
  listRejectionReasons,
  selectBroadcastFailure,
} from './broadcast-outcome.core';
import { resolveConnectionPoster } from './connection-poster.setup';
import { readRealtimeClientUrl } from './realtime.environment';
import { buildRealtimeTicket, verifyRealtimeTicket } from './realtime-ticket.utils';
import {
  forgetConnection,
  listConnectionsOutsideClient,
  rememberConnection,
} from './realtime.repository';
import {
  type ClosingRoute,
  isClosingRoute,
  isOpeningRoute,
  type OpeningRoute,
  selectRouteStatus,
  selectSocketRoute,
} from './socket-route.core';

export interface RealtimeTicketGrant {
  readonly url: string | null;
  readonly ticket: string;
}

export async function issueRealtimeTicket(
  memberId: string,
  nowMillis: number,
): Promise<RealtimeTicketGrant> {
  const config = await getAppConfig();
  if (config === null) throw new Error('auth is not bootstrapped');
  return {
    url: readRealtimeClientUrl(),
    ticket: buildRealtimeTicket(config.hmacKey, memberId, nowMillis),
  };
}

async function deliverStaleMessage(
  scope: StaleScope,
  writerClientId: string | null,
): Promise<void> {
  const poster = resolveConnectionPoster();
  if (poster === null) return;
  const connections = await listConnectionsOutsideClient(writerClientId);
  const message = buildStaleMessage(scope);
  const deliveries = await Promise.allSettled(
    connections.map(async (connection) => {
      const delivery = await postToConnection(poster, connection.connectionId, message);
      if (delivery.isGone) await forgetConnection(connection.connectionId);
    }),
  );
  const failures = listRejectionReasons(deliveries);
  if (failures.length > 0) throw new AggregateError(failures, BROADCAST_FAILED);
}

export interface StaleBroadcastSettings {
  readonly budgetMilliseconds: number;
  readonly reportFailure: (failure: TaggedFailure) => void;
}

async function settleWithinBudget(
  delivery: Promise<void>,
  budgetMilliseconds: number,
): Promise<BroadcastOutcome> {
  let budgetTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<BroadcastOutcome>((resolve) => {
    budgetTimer = setTimeout(() => {
      resolve({ kind: 'late' });
    }, budgetMilliseconds);
  });
  const settled = delivery.then(
    (): BroadcastOutcome => ({ kind: 'delivered' }),
    (error: unknown): BroadcastOutcome => {
      console.error(error);
      return { kind: 'failed', error };
    },
  );
  try {
    return await Promise.race([settled, deadline]);
  } finally {
    clearTimeout(budgetTimer);
  }
}

// @FollowsBlueprint service-orchestration
export async function announceStaleScope(
  scope: StaleScope,
  writerClientId: string | null,
  settings: StaleBroadcastSettings,
): Promise<void> {
  const outcome = await settleWithinBudget(
    deliverStaleMessage(scope, writerClientId),
    settings.budgetMilliseconds,
  );
  const failure = selectBroadcastFailure(outcome, scope);
  if (failure !== null) settings.reportFailure(failure);
}

const ACCEPTED = 200;
const REFUSED_TICKET = 401;

export interface SocketEvent {
  readonly requestContext: { readonly connectionId?: string; readonly routeKey?: string };
  readonly queryStringParameters?: Record<string, string | undefined> | null;
}

export interface SocketReply {
  readonly statusCode: number;
}

async function openConnection(route: OpeningRoute, nowMillis: number): Promise<SocketReply> {
  const config = await getAppConfig();
  if (config === null) return { statusCode: REFUSED_TICKET };
  const verdict = verifyRealtimeTicket(route.ticket, config.hmacKey, nowMillis);
  if (!verdict.ok) return { statusCode: REFUSED_TICKET };
  await rememberConnection({
    connectionId: route.connectionId,
    memberId: verdict.memberId,
    clientId: route.clientId,
  });
  return { statusCode: ACCEPTED };
}

async function closeConnection(route: ClosingRoute): Promise<SocketReply> {
  await forgetConnection(route.connectionId);
  return { statusCode: ACCEPTED };
}

// @FollowsBlueprint service-websocket-events
export async function buildSocketReply(event: SocketEvent): Promise<SocketReply> {
  const route = selectSocketRoute(
    event.requestContext.connectionId,
    event.requestContext.routeKey,
    event.queryStringParameters,
  );
  if (isOpeningRoute(route)) return await openConnection(route, Date.now());
  if (isClosingRoute(route)) return await closeConnection(route);
  return { statusCode: selectRouteStatus(route) };
}
