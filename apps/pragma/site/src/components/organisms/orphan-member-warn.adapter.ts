/** @Feature members */

import type { Lineup } from '@domain/lineup.core';
import { listOrphanMemberIds, selectUnwarnedMemberIds } from './setlist-editor.utils';

const warnedOrphanMemberIds = new Set<string>();

export function warnIfOrphanMemberIds(
  resolvedLineup: Lineup,
  knownMemberIds: ReadonlySet<string>,
  songId: string,
): void {
  const orphanMemberIds = listOrphanMemberIds(resolvedLineup, knownMemberIds);
  for (const orphanMemberId of selectUnwarnedMemberIds(orphanMemberIds, warnedOrphanMemberIds)) {
    warnedOrphanMemberIds.add(orphanMemberId);
    console.warn({ surface: 'lineup-resolver', orphanMemberId, songId });
  }
}
