import { serve } from '@hono/node-server';
import { WebSocketServer, type WebSocket } from 'ws';
import { createApp } from './app';
import { findGameIdForSocket } from './games/games.service';
import { normalizeJoinCode } from '@domain/join-code.core';
import { useConnectionPoster } from './realtime/connection-poster.setup';
import { sendWhenOpen } from './realtime/local-socket.core';
import { forgetConnection, rememberConnection } from './realtime/realtime.repository';

const DEFAULT_API_PORT = 3006;
const DEFAULT_SOCKET_PORT = 3007;
const LOCAL_SITE_PORT = 5178;

const apiPort = Number(process.env.PORT ?? DEFAULT_API_PORT);
const socketPort = Number(process.env.SOCKET_PORT ?? DEFAULT_SOCKET_PORT);

const socketsByConnectionId = new Map<string, WebSocket>();

useConnectionPoster({
  postToConnection: ({ ConnectionId, Data }) => {
    sendWhenOpen(socketsByConnectionId.get(ConnectionId), Data);
    return Promise.resolve(undefined);
  },
});

const socketServer = new WebSocketServer({ port: socketPort });

socketServer.on('connection', (socket, request) => {
  const query = new URL(request.url ?? '/', `http://localhost:${socketPort}`).searchParams;
  const connectionId = crypto.randomUUID();
  socketsByConnectionId.set(connectionId, socket);

  const registered = (async () => {
    const code = query.get('code');
    if (code === null) return;
    const gameId = await findGameIdForSocket(normalizeJoinCode(code));
    if (gameId === null) return;
    await rememberConnection({ connectionId, gameId });
  })();

  socket.on('close', () => {
    socketsByConnectionId.delete(connectionId);
    void registered.then(async () => {
      await forgetConnection(connectionId);
    });
  });
});

process.env.WEBSOCKET_CLIENT_URL = `ws://localhost:${socketPort}`;
process.env.WEBAUTHN_RELYING_PARTY_ID ??= 'localhost';
process.env.WEBAUTHN_ORIGIN ??= `http://localhost:${LOCAL_SITE_PORT}`;

// @FollowsBlueprint api-dev-entrypoint
const app = createApp();

serve({ fetch: app.fetch, port: apiPort }, (info) => {
  console.log(`skull-king api listening on http://localhost:${info.port}`);
  console.log(`skull-king socket listening on ws://localhost:${socketPort}`);
});
