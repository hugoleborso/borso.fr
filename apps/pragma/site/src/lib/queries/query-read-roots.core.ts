import {
  type ApiRoot,
  EVERY_WRITTEN_ROOT,
  expandReadRoots,
  type WrittenRoot,
} from '@domain/stale-scope.core';

export const QUERY_READ_ROOTS: Readonly<Record<string, readonly ApiRoot[]>> = {
  'assistant-grants': ['assistant-grants', 'oauth'],
  audience: ['audience'],
  auth: ['instruments'],
  bars: ['bars'],
  'free-slots': ['free-slots'],
  improvements: ['improvements'],
  instruments: ['instruments'],
  mastery: ['mastery'],
  me: ['me'],
  members: ['members'],
  notifications: ['notifications'],
  'offline-manifest': ['offline-manifest'],
  outreach: ['outreach'],
  sessions: ['sessions'],
  setlists: ['setlists'],
  songs: ['songs'],
  streaks: ['streaks'],
  studies: ['studies', 'mastery'],
  takes: ['takes'],
  tasks: ['tasks'],
  'transition-comments': ['transition-comments'],
  uploads: [],
  voting: ['setlists'],
};

export type StaleQueryRoots = readonly string[] | typeof EVERY_WRITTEN_ROOT;

function isReadingAny(reads: readonly ApiRoot[], written: readonly WrittenRoot[]): boolean {
  const expanded: ReadonlySet<string> = expandReadRoots(reads);
  return written.some((root) => expanded.has(root));
}

// @FollowsBlueprint core-lookup-table
export function selectStaleQueryRoots(
  written: readonly WrittenRoot[],
  table: Readonly<Record<string, readonly ApiRoot[]>> = QUERY_READ_ROOTS,
): StaleQueryRoots {
  if (written.includes(EVERY_WRITTEN_ROOT)) return EVERY_WRITTEN_ROOT;
  return Object.entries(table)
    .filter(([, reads]) => isReadingAny(reads, written))
    .map(([queryRoot]) => queryRoot);
}
