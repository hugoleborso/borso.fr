/** @Feature songs */

import { toggleInstrumentHeld } from '../../components/molecules/lineup-editor.core';

export const SONG_EDIT_SECTION_PARAM = 'section';
export const SONG_EDIT_SECTIONS = ['identity', 'music', 'notes', 'lineup'] as const;
export type SongEditSection = (typeof SONG_EDIT_SECTIONS)[number];
const DEFAULT_SONG_EDIT_SECTION: SongEditSection = 'identity';

export type SongLineupDraft = Readonly<Record<string, readonly string[]>>;

// @FollowsBlueprint core-decision
export function readSongEditSection(requested: string | null): SongEditSection {
  return SONG_EDIT_SECTIONS.find((section) => section === requested) ?? DEFAULT_SONG_EDIT_SECTION;
}

// @FollowsBlueprint core-decision
export function toggleLineupInstrument(
  lineup: SongLineupDraft,
  memberId: string,
  instrumentId: string,
): Record<string, string[]> {
  const toggled: Record<string, string[]> = {};
  for (const [otherId, instrumentIds] of Object.entries(lineup)) {
    toggled[otherId] = [...instrumentIds];
  }
  toggled[memberId] = toggleInstrumentHeld(lineup[memberId] ?? [], instrumentId);
  return toggled;
}
