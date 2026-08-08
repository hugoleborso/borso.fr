/**
 * The application's routing table, as a pure reading of the path.
 *
 * Every route is a literal name plus the parameters it carries, so the shell
 * looks the page up in a table rather than testing the path itself.
 */

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

export function parseRoute(pathname: string): Route {
  const named = ROUTE_BY_PATH[pathname];
  if (named !== undefined) return { name: named, runnerSlug: '' };
  if (!pathname.startsWith(RUNNER_PATH_PREFIX)) return { name: 'not-found', runnerSlug: '' };
  const runnerSlug = pathname.slice(RUNNER_PATH_PREFIX.length);
  if (!RUNNER_SLUG_PATTERN.test(runnerSlug)) return { name: 'not-found', runnerSlug: '' };
  return { name: 'runner', runnerSlug };
}

/** The class the navigation bar puts on the link for the page in view. */
export function selectNavigationClassName(pathname: string, target: RouteName): string {
  if (parseRoute(pathname).name === target) return 'active';
  return '';
}

export function composeRunnerPath(runnerSlug: string): string {
  return `/r/${encodeURIComponent(runnerSlug)}`;
}
