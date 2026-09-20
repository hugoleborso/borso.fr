/** @Feature setlists */

import type { Lineup } from '@domain/lineup.core';
import { instrumentedMembers, resolveLineup } from '@domain/lineup.core';

export const SETLIST_ENTRY_TONES = ['plain', 'unstaffed', 'overridden'] as const;

export type SetlistEntryTone = (typeof SETLIST_ENTRY_TONES)[number];

export interface SetlistEntryToneAppearance {
  readonly surfaceClassName: string;
  readonly borderClassName: string;
}

const TONE_APPEARANCE: Readonly<Record<SetlistEntryTone, SetlistEntryToneAppearance>> = {
  plain: { surfaceClassName: 'bg-bg-elev', borderClassName: 'border-line' },
  unstaffed: { surfaceClassName: 'bg-bg-sunk', borderClassName: 'border-line' },
  overridden: { surfaceClassName: 'bg-warn-soft', borderClassName: 'border-warn' },
};

const NOTHING_HELD: readonly string[] = [];

function isSameInstrumentSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((instrumentId) => right.includes(instrumentId));
}

function isTheSongsOwnLineup(resolvedLineup: Lineup, songDefaultLineup: Lineup): boolean {
  return Object.entries(resolvedLineup).every(([memberId, instrumentIds]) =>
    isSameInstrumentSet(instrumentIds, songDefaultLineup[memberId] ?? NOTHING_HELD),
  );
}

// @FollowsBlueprint core-appearance
export function isOverridingSongLineup(
  songDefaultLineup: Lineup,
  entryLineupOverride: Lineup | null,
): boolean {
  const resolved = resolveLineup(songDefaultLineup, entryLineupOverride);
  return !isTheSongsOwnLineup(resolved, songDefaultLineup);
}

// @FollowsBlueprint core-appearance
export function selectSetlistEntryTone(
  songDefaultLineup: Lineup,
  entryLineupOverride: Lineup | null,
): SetlistEntryTone {
  const resolved = resolveLineup(songDefaultLineup, entryLineupOverride);
  if (instrumentedMembers(resolved).length === 0) return 'unstaffed';
  return isOverridingSongLineup(songDefaultLineup, entryLineupOverride) ? 'overridden' : 'plain';
}

// @FollowsBlueprint core-appearance
export function selectSetlistEntryToneAppearance(
  tone: SetlistEntryTone,
): SetlistEntryToneAppearance {
  return TONE_APPEARANCE[tone];
}
