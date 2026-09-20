export type SocketRoute =
  | { readonly kind: 'refuse' }
  | { readonly kind: 'ignore' }
  | { readonly kind: 'close'; readonly connectionId: string }
  | {
      readonly kind: 'open';
      readonly connectionId: string;
      readonly joinCode: string;
      readonly token: string | null;
    };

const CONNECT_ROUTE = '$connect';
const DISCONNECT_ROUTE = '$disconnect';

/**
 * @Blueprint core-reading-a-vendor-event
 * @BlueprintName Core Reading A Vendor Event
 * @BlueprintUsage Use for the step that turns a cloud provider's event shape into something this application named, before any handler acts on it.
 * @BlueprintDescription Returns a tagged union rather than a set of loose fields, so the handler above it reads as one decision per case and cannot act on a connection that carries no identifier. Keeping it pure and in its own file is what lets the exact payload API Gateway sends, including the absent fields it sends in practice, be covered by ordinary unit tests instead of by a deploy and a manual socket.
 */
export function selectSocketRoute(
  connectionId: string | undefined,
  routeKey: string | undefined,
  query: Record<string, string | undefined> | null | undefined,
): SocketRoute {
  if (connectionId === undefined) return { kind: 'refuse' };
  if (routeKey === DISCONNECT_ROUTE) return { kind: 'close', connectionId };
  if (routeKey !== CONNECT_ROUTE) return { kind: 'ignore' };
  if (query === null || query === undefined) return { kind: 'refuse' };
  const joinCode = query.code;
  if (joinCode === undefined || joinCode.length === 0) return { kind: 'refuse' };
  return { kind: 'open', connectionId, joinCode, token: query.token ?? null };
}

export type OpeningRoute = Extract<SocketRoute, { readonly kind: 'open' }>;
export type ClosingRoute = Extract<SocketRoute, { readonly kind: 'close' }>;

const REFUSED_STATUS = 400;
const ACCEPTED_STATUS = 200;

export function isOpeningRoute(route: SocketRoute): route is OpeningRoute {
  return route.kind === 'open';
}

export function isClosingRoute(route: SocketRoute): route is ClosingRoute {
  return route.kind === 'close';
}

export function selectRouteStatus(route: SocketRoute): number {
  return route.kind === 'refuse' ? REFUSED_STATUS : ACCEPTED_STATUS;
}
