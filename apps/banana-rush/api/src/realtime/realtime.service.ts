import { findSocketSubject } from '../games/games.service';
import type { GameView } from '../games/games.types';
import { normalizeJoinCode } from '../games/join-code.utils';
import { postToConnection } from './broadcast.adapter';
import { resolveConnectionPoster } from './connection-poster.setup';
import {
  forgetConnection,
  listConnectionsForGame,
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

export interface GameBroadcast {
  readonly kind: 'game';
  readonly game: GameView;
}

// @FollowsBlueprint service-orchestration
export async function broadcastGame(gameId: string, game: GameView): Promise<void> {
  const poster = resolveConnectionPoster();
  if (poster === null) return;
  const connections = await listConnectionsForGame(gameId);
  const message: GameBroadcast = { kind: 'game', game };
  await Promise.all(
    connections.map(async (connection) => {
      const delivery = await postToConnection(poster, connection.connectionId, message);
      if (delivery.isGone) await forgetConnection(connection.connectionId);
    }),
  );
}

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
  const subject = await findSocketSubject(normalizeJoinCode(route.joinCode), route.token);
  if (subject === null) return { statusCode: REFUSED };
  await rememberConnection({
    connectionId: route.connectionId,
    gameId: subject.gameId,
    playerId: subject.playerId,
  });
  return { statusCode: ACCEPTED };
}

async function closeConnection(route: ClosingRoute): Promise<SocketReply> {
  await forgetConnection(route.connectionId);
  return { statusCode: ACCEPTED };
}

/**
 * @Blueprint service-websocket-events
 * @BlueprintName Service For WebSocket Events
 * @BlueprintUsage Use for the routes of an API Gateway WebSocket API, when the socket is a delivery channel and never a command channel.
 * @BlueprintDescription Handles only the route keys that change who is listening and answers everything else without touching the database, because a message arriving on this socket can never change the game. That is the whole security argument for the channel: somebody who crafts a frame reaches code that writes one connection row and nothing else, while every real write goes through the HTTP API where the schemas and the rules live. Reading the event is a pure function in its own file, so the shape the vendor sends, including the fields it omits, is covered by ordinary unit tests rather than by a deploy.
 */
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
