/** @Feature auth */

export type SessionGateState = 'sign-in-required' | 'opening' | 'opening-failed' | 'granted';

export type OpeningWait = 'band-data' | 'reading' | 'failed' | 'not-started';

export type OpeningOverlay = 'restoring' | 'opening' | 'opening-failed' | 'leaving';

export type ConnectionNote = 'online' | 'offline';

export const AUTH_QUERY_ROOT = 'auth';

export const OPENING_EXIT_ANIMATION = 'downbeat-exit';

export interface CachedQuery {
  readonly queryKey: readonly unknown[];
  readonly state: {
    readonly status: 'pending' | 'error' | 'success';
    readonly fetchStatus: 'fetching' | 'paused' | 'idle';
    readonly data: unknown;
  };
}

export function isBandDataQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] !== AUTH_QUERY_ROOT;
}

function hasBandData(query: CachedQuery): boolean {
  return isBandDataQuery(query.queryKey) && query.state.data !== undefined;
}

function isFetching(query: CachedQuery): boolean {
  return query.state.fetchStatus === 'fetching';
}

function hasGivenUp(query: CachedQuery): boolean {
  return query.state.status === 'error' || query.state.fetchStatus === 'paused';
}

// @FollowsBlueprint core-view-intent
export function selectOpeningWait(queries: readonly CachedQuery[]): OpeningWait {
  if (queries.some(hasBandData)) return 'band-data';
  if (queries.some(isFetching)) return 'reading';
  if (queries.some(hasGivenUp)) return 'failed';
  return 'not-started';
}

const GATE_STATE_BY_OPENING_WAIT = {
  'band-data': 'granted',
  reading: 'opening',
  'not-started': 'opening',
  failed: 'opening-failed',
} as const satisfies Readonly<Record<OpeningWait, SessionGateState>>;

// @FollowsBlueprint core-view-intent
export function selectSessionGateState(
  hasMarker: boolean,
  isProbeAuthenticated: boolean | undefined,
  openingWait: OpeningWait,
): SessionGateState {
  if (!hasMarker || isProbeAuthenticated === false) return 'sign-in-required';
  return GATE_STATE_BY_OPENING_WAIT[openingWait];
}

// @FollowsBlueprint core-view-intent
export function selectOpeningOverlay(
  gateState: SessionGateState,
  isRestoring: boolean,
  hasOpened: boolean,
  hasLeft: boolean,
): OpeningOverlay | null {
  if (gateState === 'sign-in-required') return null;
  if (gateState === 'granted') return hasOpened && !hasLeft ? 'leaving' : null;
  return isRestoring ? 'restoring' : gateState;
}

export function isOpeningExit(animationName: string): boolean {
  return animationName === OPENING_EXIT_ANIMATION;
}

export function selectConnectionNote(isOnline: boolean): ConnectionNote {
  return isOnline ? 'online' : 'offline';
}
