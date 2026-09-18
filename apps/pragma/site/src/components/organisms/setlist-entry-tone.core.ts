/** @Feature setlists */

import type { Lineup } from '@domain/lineup.core';
import { instrumentedMembers } from '@domain/lineup.core';

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

// @FollowsBlueprint core-appearance
export function selectSetlistEntryTone(
  resolvedLineup: Lineup,
  hasOverride: boolean,
): SetlistEntryTone {
  if (instrumentedMembers(resolvedLineup).length === 0) return 'unstaffed';
  return hasOverride ? 'overridden' : 'plain';
}

// @FollowsBlueprint core-appearance
export function selectSetlistEntryToneAppearance(
  tone: SetlistEntryTone,
): SetlistEntryToneAppearance {
  return TONE_APPEARANCE[tone];
}
