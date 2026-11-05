import { serve } from '@hono/node-server';
import { type WebSocket, WebSocketServer } from 'ws';
import { createApp } from './app';
import { useConnectionPoster } from './realtime/connection-poster.setup';
import { isSocketReplyAccepted, sendWhenOpen } from './realtime/local-socket.core';
import { buildSocketReply } from './realtime/realtime.service';

const DEFAULT_API_PORT = 3001;
const DEFAULT_SOCKET_PORT = 3004;
const REFUSED_CLOSE_CODE = 4401;

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

  const connected = buildSocketReply({
    requestContext: { connectionId, routeKey: '$connect' },
    queryStringParameters: Object.fromEntries(query),
  }).then((reply) => {
    const isAccepted = isSocketReplyAccepted(reply);
    if (!isAccepted) socket.close(REFUSED_CLOSE_CODE);
  });

  socket.on('close', () => {
    socketsByConnectionId.delete(connectionId);
    void connected.then(async () => {
      await buildSocketReply({ requestContext: { connectionId, routeKey: '$disconnect' } });
    });
  });
});

process.env.WEBSOCKET_CLIENT_URL = `ws://localhost:${socketPort}`;

// @FollowsBlueprint api-dev-entrypoint
const app = createApp();

serve({ fetch: app.fetch, port: apiPort }, (info) => {
  console.log(`pragma api listening on http://localhost:${info.port}`);
  console.log(`pragma socket listening on ws://localhost:${socketPort}`);
});
