import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type BroadcastGame, mergeBroadcast, parseBroadcast } from './game-broadcast.core';
import { gameKeys } from './queries/game.queries';

const RECONNECT_DELAY_MS = 1_500;

export function buildSocketAddress(
  baseUrl: string,
  joinCode: string,
  token: string | null,
): string {
  const address = new URL(baseUrl);
  address.searchParams.set('code', joinCode);
  if (token !== null) address.searchParams.set('token', token);
  return address.toString();
}

/**
 * @Blueprint hook-socket-feeding-the-query-cache
 * @BlueprintName Hook Feeding A Socket Into The Query Cache
 * @BlueprintUsage Use for a push channel whose messages describe a record the screens already read through TanStack Query.
 * @BlueprintDescription One of the few effects this repository allows, because a socket is an external system with a lifetime of its own and nothing renders it. It writes into the query cache rather than into component state, so every screen reading that key updates without a single prop being threaded and without the hook knowing who is listening. The reconnect timer and the socket are both closed by the same cleanup, and a `closed` flag stops a reconnect that was already scheduled when the effect tore down, which is what keeps a socket from outliving the screen that opened it in React's strict double mount.
 */
export function useGameSocket(
  socketUrl: string | null,
  joinCode: string,
  token: string | null,
): void {
  const queryClient = useQueryClient();

  // eslint-disable-next-line borso/no-use-effect -- synchronises with an external system: the WebSocket connection to API Gateway, which owns its own lifetime, renders nothing, and has to be closed when the screen goes away
  useEffect(() => {
    if (socketUrl === null || joinCode.length === 0) return;

    let isClosed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const open = () => {
      if (isClosed) return;
      socket = new WebSocket(buildSocketAddress(socketUrl, joinCode, token));
      socket.addEventListener('message', (event: MessageEvent<unknown>) => {
        const incoming = parseBroadcast(event.data);
        if (incoming === null) return;
        queryClient.setQueryData<BroadcastGame>(gameKeys.detail(joinCode), (previous) =>
          mergeBroadcast(previous, incoming),
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
  }, [socketUrl, joinCode, token, queryClient]);
}
