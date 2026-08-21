export type RouteName = 'spectator' | 'admin' | 'archives' | 'runner' | 'not-found';

export interface Route {
  readonly name: RouteName;
  readonly runnerSlug: string;
}

const RUNNER_PATH_PREFIX = '/r/';
const RUNNER_SLUG_PATTERN = /^[a-z0-9-]+$/;

const ROUTE_BY_PATH: Readonly<Record<string, RouteName>> = {
  '/': 'spectator',
  '/spectator': 'spectator',
  '/admin': 'admin',
  '/archives': 'archives',
};

/**
 * @Blueprint route-table
 * @BlueprintName Routing As A Table And A Parser
 * @BlueprintUsage Use for routing an application small enough not to want a router library.
 * @BlueprintDescription Holds the fixed paths in `ROUTE_BY_PATH`, a frozen record of path to route name, and reads anything parameterised with one prefix check and one pattern. The result is a `RouteName` from a closed union plus the parameters it carries, so the shell indexes a record of pages instead of testing the path, and an unknown path resolves to `'not-found'` rather than to nothing. Pure, so every path in the table has a test.
 */
export function parseRoute(pathname: string): Route {
  const named = ROUTE_BY_PATH[pathname];
  if (named !== undefined) return { name: named, runnerSlug: '' };
  if (!pathname.startsWith(RUNNER_PATH_PREFIX)) return { name: 'not-found', runnerSlug: '' };
  const runnerSlug = pathname.slice(RUNNER_PATH_PREFIX.length);
  if (!RUNNER_SLUG_PATTERN.test(runnerSlug)) return { name: 'not-found', runnerSlug: '' };
  return { name: 'runner', runnerSlug };
}

export type NavigationItemState = 'active' | 'inactive';

export function selectNavigationState(pathname: string, target: RouteName): NavigationItemState {
  if (parseRoute(pathname).name === target) return 'active';
  return 'inactive';
}

export function composeRunnerPath(runnerSlug: string): string {
  return `/r/${encodeURIComponent(runnerSlug)}`;
}
