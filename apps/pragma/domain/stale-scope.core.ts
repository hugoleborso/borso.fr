import { PRAGMA_REQUEST_HEADERS } from './request-headers.core';

export const EVERY_WRITTEN_ROOT = 'all';

export const WRITTEN_API_ROOTS = [
  'audience',
  'bars',
  'improvements',
  'instruments',
  'mastery',
  'me',
  'members',
  'outreach',
  'sessions',
  'setlists',
  'songs',
  'studies',
  'takes',
  'tasks',
  'transition-comments',
] as const;

export const UNANNOUNCED_API_ROOTS = [
  'assistant-grants',
  'free-slots',
  'notifications',
  'oauth',
  'offline-manifest',
  'streaks',
] as const;

export type WrittenApiRoot = (typeof WRITTEN_API_ROOTS)[number];

export type ApiRoot = WrittenApiRoot | (typeof UNANNOUNCED_API_ROOTS)[number];

export type WrittenRoot = WrittenApiRoot | typeof EVERY_WRITTEN_ROOT;

export const STALE_MESSAGE_KIND = 'stale';

export interface StaleMessage {
  readonly kind: typeof STALE_MESSAGE_KIND;
  readonly written: readonly WrittenRoot[];
}

const WRITTEN_ROOTS: readonly WrittenRoot[] = [...WRITTEN_API_ROOTS, EVERY_WRITTEN_ROOT];

// @FollowsBlueprint core-decision
export function isWrittenRoot(value: unknown): value is WrittenRoot {
  return WRITTEN_ROOTS.some((root) => root === value);
}

export function buildStaleMessage(written: readonly WrittenRoot[]): StaleMessage {
  return { kind: STALE_MESSAGE_KIND, written };
}

export const REALTIME_CLIENT_HEADER = PRAGMA_REQUEST_HEADERS.realtimeClient;

const READ_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isReadMethod(method: string): boolean {
  return READ_METHODS.has(method.toUpperCase());
}

export const DERIVED_READ_ROOTS: Readonly<Partial<Record<ApiRoot, readonly ApiRoot[]>>> = {
  'assistant-grants': ['members'],
  audience: ['sessions', 'setlists', 'songs'],
  bars: ['members'],
  'free-slots': ['me', 'members'],
  instruments: ['members'],
  mastery: ['instruments', 'members', 'songs'],
  me: ['members'],
  members: ['instruments'],
  notifications: ['members'],
  oauth: ['members'],
  'offline-manifest': ['instruments', 'sessions', 'songs'],
  sessions: ['instruments', 'songs'],
  setlists: ['instruments', 'members', 'sessions', 'songs'],
  songs: ['instruments', 'members'],
  streaks: ['sessions', 'studies'],
  studies: ['instruments', 'mastery', 'members', 'sessions', 'setlists', 'songs', 'streaks'],
  takes: ['members', 'sessions', 'songs'],
  tasks: ['instruments', 'members', 'sessions', 'songs'],
  'transition-comments': ['songs'],
};

function collectReadRoots(
  root: ApiRoot,
  derived: Readonly<Partial<Record<ApiRoot, readonly ApiRoot[]>>>,
  collected: Set<ApiRoot>,
): void {
  if (collected.has(root)) return;
  collected.add(root);
  for (const dependency of derived[root] ?? []) collectReadRoots(dependency, derived, collected);
}

// @FollowsBlueprint core-lookup-table
export function expandReadRoots(
  roots: readonly ApiRoot[],
  derived: Readonly<Partial<Record<ApiRoot, readonly ApiRoot[]>>> = DERIVED_READ_ROOTS,
): ReadonlySet<ApiRoot> {
  const collected = new Set<ApiRoot>();
  for (const root of roots) collectReadRoots(root, derived, collected);
  return collected;
}
