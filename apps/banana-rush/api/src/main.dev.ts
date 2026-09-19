import { serve } from '@hono/node-server';
import { WebSocketServer, type WebSocket } from 'ws';
import { createApp } from './app';
import { findGameByJoinCode, findPlayerByTokenHash } from './games/games.repository';
import { normalizeJoinCode } from './games/join-code.utils';
import { hashPlayerToken } from './games/player-token.utils';
import { useConnectionPoster } from './realtime/connection-poster.setup';
import { sendWhenOpen } from './realtime/local-socket.core';
import { forgetConnection, rememberConnection } from './realtime/realtime.repository';

const DEFAULT_API_PORT = 3002;
const DEFAULT_SOCKET_PORT = 3003;

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
    const game = await findGameByJoinCode(normalizeJoinCode(code));
    if (game === null) return;
    const token = query.get('token');
    const player =
      token === null ? null : await findPlayerByTokenHash(game.id, hashPlayerToken(token));
    await rememberConnection({ connectionId, gameId: game.id, playerId: player?.id ?? null });
  })();

  socket.on('close', () => {
    socketsByConnectionId.delete(connectionId);
    void registered.then(async () => {
      await forgetConnection(connectionId);
    });
  });
});

process.env.WEBSOCKET_CLIENT_URL = `ws://localhost:${socketPort}`;

// @FollowsBlueprint api-dev-entrypoint
const app = createApp();

serve({ fetch: app.fetch, port: apiPort }, (info) => {
  console.log(`banana-rush api listening on http://localhost:${info.port}`);
  console.log(`banana-rush socket listening on ws://localhost:${socketPort}`);
});
