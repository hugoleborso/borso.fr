export interface MountedRoute {
  readonly method: string;
  readonly path: string;
}

export interface RouteToolCoverage {
  readonly routesWithoutTool: readonly string[];
  readonly toolsWithoutRoute: readonly string[];
  readonly staleExclusions: readonly string[];
}

const ANY_METHOD = '*';
const MIDDLEWARE_METHOD = 'ALL';
const SUBTREE_SUFFIX = '/*';
const ROUTE_SEPARATOR = ' ';

export const TOOL_EXCLUSIONS: Readonly<Record<string, string>> = Object.freeze({
  'GET /api/health': 'A liveness probe for the platform; it carries no band data.',
  '* /api/auth/*':
    'Signing in with a password or a passkey is done in the browser; an assistant acts through its grant.',
  '* /api/admin/*': 'Setting and rotating the credentials of the operator stays with the operator.',
  '* /api/__test/*': 'The test seed, mounted only outside production.',
  '* /api/audience/*': 'The ballot of the concert audience, used by the public and not by members.',
  '* /api/uploads/*':
    'Presigned addresses the upload flow of the app uses; takes have request_take_upload.',
  'GET /api/offline-manifest': 'The list a browser caches for offline use, bound to that browser.',
  '* /api/oauth/*':
    'The consent page, which the member answers in the browser, never an assistant.',
  '* /api/assistant-grants/*':
    'The member manages assistant connections on the Account page; a tool would let an assistant extend or end its own access.',
  'PUT /api/me/password':
    'A credential; changing it would also end the grant of the assistant itself.',
  '* /api/me/passkeys/*': 'Passkeys are credentials bound to one device.',
  '* /api/me/calendar-feed':
    'The secret address of the calendar of the member is a credential to a third-party service.',
  '* /api/notifications/subscriptions': 'A push subscription belongs to one browser.',
  'GET /api/notifications/vapid-public-key': 'Read by a browser to subscribe to push.',
  '* /mcp': 'The transport the tools are served through.',
  '* /oauth/*': 'The authorization server an assistant connects with.',
  '* /.well-known/*': 'The discovery documents an assistant reads before connecting.',
});

function describeRoute(route: MountedRoute): string {
  return `${route.method}${ROUTE_SEPARATOR}${route.path}`;
}

function isPathCovered(pattern: string, path: string): boolean {
  if (!pattern.endsWith(SUBTREE_SUFFIX)) return pattern === path;
  const prefix = pattern.slice(0, -SUBTREE_SUFFIX.length);
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isRouteCoveredBy(exclusion: string, route: MountedRoute): boolean {
  const separatorIndex = exclusion.indexOf(ROUTE_SEPARATOR);
  const method = exclusion.slice(0, separatorIndex);
  const pattern = exclusion.slice(separatorIndex + ROUTE_SEPARATOR.length);
  const isMethodCovered = method === ANY_METHOD || method === route.method;
  return isMethodCovered && isPathCovered(pattern, route.path);
}

function listEndpoints(routes: readonly MountedRoute[]): readonly MountedRoute[] {
  const seen = new Map<string, MountedRoute>();
  for (const route of routes) {
    if (route.method !== MIDDLEWARE_METHOD) seen.set(describeRoute(route), route);
  }
  return [...seen.values()];
}

// @FollowsBlueprint core-decision
export function compareRoutesWithTools(
  routes: readonly MountedRoute[],
  toolRoutes: readonly string[],
  exclusions: Readonly<Record<string, string>>,
): RouteToolCoverage {
  const endpoints = listEndpoints(routes);
  const endpointNames = new Set(endpoints.map(describeRoute));
  const servedRoutes = new Set(toolRoutes);
  const exclusionKeys = Object.keys(exclusions);
  const isExcluded = (route: MountedRoute) =>
    exclusionKeys.some((exclusion) => isRouteCoveredBy(exclusion, route));
  return {
    routesWithoutTool: endpoints
      .filter((route) => !servedRoutes.has(describeRoute(route)) && !isExcluded(route))
      .map(describeRoute),
    toolsWithoutRoute: [...servedRoutes].filter((toolRoute) => !endpointNames.has(toolRoute)),
    staleExclusions: exclusionKeys.filter(
      (exclusion) => !endpoints.some((route) => isRouteCoveredBy(exclusion, route)),
    ),
  };
}
