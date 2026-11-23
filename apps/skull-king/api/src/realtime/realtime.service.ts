import { findGameIdForSocket } from '../games/games.service';
import { normalizeJoinCode } from '@domain/join-code.core';
import { forgetConnection, rememberConnection } from './realtime.repository';
import {
  type ClosingRoute,
  isClosingRoute,
  isOpeningRoute,
  type OpeningRoute,
  selectRouteStatus,
  selectSocketRoute,
} from './socket-route.core';

const ACCEPTED = 200;
const REFUSED = 400;

export interface SocketEvent {
  readonly requestContext: { readonly connectionId?: string; readonly routeKey?: string };
  readonly queryStringParameters?: Record<string, string | undefined> | null;
}

export interface SocketReply {
  readonly statusCode: number;
}

async function openConnection(route: OpeningRoute): Promise<SocketReply> {
  const gameId = await findGameIdForSocket(normalizeJoinCode(route.joinCode));
  if (gameId === null) return { statusCode: REFUSED };
  await rememberConnection({ connectionId: route.connectionId, gameId });
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
  if (isOpeningRoute(route)) return await openConnection(route);
  if (isClosingRoute(route)) return await closeConnection(route);
  return { statusCode: selectRouteStatus(route) };
}
