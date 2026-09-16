/** @Feature audience-voting */

export type ShortAddressResolution =
  | { readonly kind: 'resolving' }
  | { readonly kind: 'no-concert-live' }
  | { readonly kind: 'redirect'; readonly path: string };

const VOTE_PATH_PREFIX = '/vote/';

export interface ResolveShortAddressParams {
  readonly isResolving: boolean;
  readonly liveSessionId: string | null | undefined;
}

// @FollowsBlueprint core-decision
export function resolveShortAddress(params: ResolveShortAddressParams): ShortAddressResolution {
  if (params.isResolving) return { kind: 'resolving' };
  const liveSessionId = params.liveSessionId;
  if (liveSessionId === null || liveSessionId === undefined) return { kind: 'no-concert-live' };
  return { kind: 'redirect', path: `${VOTE_PATH_PREFIX}${liveSessionId}` };
}
