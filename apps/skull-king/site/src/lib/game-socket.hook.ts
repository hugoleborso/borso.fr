import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type GameCache, receiveBroadcast } from './game-cache.core';
import { gameKeys } from './queries/game.queries';

const RECONNECT_DELAY_MS = 1_500;

function buildSocketAddress(baseUrl: string, joinCode: string): string {
  const address = new URL(baseUrl);
  address.searchParams.set('code', joinCode);
  return address.toString();
}

// @FollowsBlueprint hook-socket-feeding-the-query-cache
export function useGameSocket(socketUrl: string | null, joinCode: string): void {
  const queryClient = useQueryClient();

  // eslint-disable-next-line borso/no-use-effect -- synchronises with an external system: the WebSocket connection to API Gateway, which owns its own lifetime, renders nothing, and has to be closed when the screen goes away
  useEffect(() => {
    if (socketUrl === null || joinCode.length === 0) return;

    let isClosed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const open = () => {
      if (isClosed) return;
      socket = new WebSocket(buildSocketAddress(socketUrl, joinCode));
      socket.addEventListener('message', (event: MessageEvent<unknown>) => {
        queryClient.setQueryData<GameCache>(gameKeys.detail(joinCode), (cache) =>
          receiveBroadcast(cache, event.data, joinCode),
        );
      });
      socket.addEventListener('close', () => {
        if (isClosed) return;
        reconnectTimer = setTimeout(open, RECONNECT_DELAY_MS);
      });
    };

    open();

    return () => {
      isClosed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [socketUrl, joinCode, queryClient]);
}
