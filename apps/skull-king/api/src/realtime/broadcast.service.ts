import type { GameView } from '../games/games.types';
import { postToConnection } from './broadcast.adapter';
import { resolveConnectionPoster } from './connection-poster.setup';
import { forgetConnection, listConnectionsForGame } from './realtime.repository';

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
