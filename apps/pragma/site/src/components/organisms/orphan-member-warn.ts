/**
 * Detection floor for R1 of the lineup-editor plan: an orphan member
 * id surviving in a resolved lineup after a missed cascade-scrub.
 *
 * Owns a module-level Set so that each unique orphan is logged exactly
 * once across the session — keeps the console readable even if the
 * editor re-renders dozens of times. The pure half (`findOrphanMemberIds`)
 * lives in `setlist-editor.utils.ts`; the side-effecty wrapper lives
 * here so the utils file stays free of `console.warn`.
 */

import { findOrphanMemberIds, selectUnwarnedMemberIds } from './setlist-editor.utils';

const warnedOrphanMemberIds = new Set<string>();

export function warnIfOrphanMemberIds(
  resolvedLineup: Readonly<Record<string, string | null>>,
  knownMemberIds: ReadonlySet<string>,
  songId: string,
): void {
  const orphanMemberIds = findOrphanMemberIds(resolvedLineup, knownMemberIds);
  for (const orphanMemberId of selectUnwarnedMemberIds(orphanMemberIds, warnedOrphanMemberIds)) {
    warnedOrphanMemberIds.add(orphanMemberId);
    console.warn({ surface: 'lineup-resolver', orphanMemberId, songId });
  }
}
