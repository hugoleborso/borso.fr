export interface MatchedRoute {
  readonly method: string;
  readonly path: string;
}

const MIDDLEWARE_METHOD = 'ALL';
const UNMATCHED_ROUTE = 'unmatched route';

// @FollowsBlueprint core-decision
export function selectRouteName(matchedRoutes: readonly MatchedRoute[]): string {
  const handlerRoutes = matchedRoutes.filter((route) => route.method !== MIDDLEWARE_METHOD);
  return handlerRoutes.at(-1)?.path ?? UNMATCHED_ROUTE;
}
