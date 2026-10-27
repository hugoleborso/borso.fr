/** @Feature auth */

const AUTHORIZATION_PARAMETER_NAMES = [
  'response_type',
  'client_id',
  'redirect_uri',
  'code_challenge',
  'code_challenge_method',
  'state',
  'scope',
  'resource',
] as const;

type AuthorizationParameterName = (typeof AUTHORIZATION_PARAMETER_NAMES)[number];

export type ConsentAuthorizationQuery = Partial<Record<AuthorizationParameterName, string>>;

export function readAuthorizationQuery(search: string): ConsentAuthorizationQuery {
  const parameters = new URLSearchParams(search);
  const query: ConsentAuthorizationQuery = {};
  for (const name of AUTHORIZATION_PARAMETER_NAMES) {
    const value = parameters.get(name);
    if (value !== null) query[name] = value;
  }
  return query;
}

export type ConsentView = 'loading' | 'invalid' | 'ready';

export interface ConsentRequestState {
  readonly isPending: boolean;
  readonly isError: boolean;
}

// @FollowsBlueprint core-view-intent
export function selectConsentView(request: ConsentRequestState): ConsentView {
  if (request.isError) return 'invalid';
  if (request.isPending) return 'loading';
  return 'ready';
}
