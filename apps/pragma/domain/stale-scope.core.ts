export const EVERY_STALE_SCOPE = 'all';

export const NARROW_STALE_SCOPES = [
  'audience',
  'bars',
  'free-slots',
  'improvements',
  'mastery',
  'members',
  'outreach',
  'setlists',
  'takes',
  'tasks',
  'transition-comments',
] as const;

export type NarrowStaleScope = (typeof NARROW_STALE_SCOPES)[number];

export type StaleScope = NarrowStaleScope | typeof EVERY_STALE_SCOPE;

export const STALE_MESSAGE_KIND = 'stale';

export interface StaleMessage {
  readonly kind: typeof STALE_MESSAGE_KIND;
  readonly scope: StaleScope;
}

const STALE_SCOPES: readonly StaleScope[] = [...NARROW_STALE_SCOPES, EVERY_STALE_SCOPE];

// @FollowsBlueprint core-decision
export function isStaleScope(value: unknown): value is StaleScope {
  return STALE_SCOPES.some((scope) => scope === value);
}

export function buildStaleMessage(scope: StaleScope): StaleMessage {
  return { kind: STALE_MESSAGE_KIND, scope };
}

export const REALTIME_CLIENT_HEADER = 'X-Pragma-Client';
