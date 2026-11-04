/** @Feature songs */

export const SONG_VIEW_TAB_PARAM = 'tab';
export const SONG_VIEW_TABS = ['info', 'lineup', 'chords', 'takes'] as const;
export type SongViewTab = (typeof SONG_VIEW_TABS)[number];

// @FollowsBlueprint core-decision
export function readSongViewTab(requested: string | null, isTakeSelected: boolean): SongViewTab {
  const named = SONG_VIEW_TABS.find((tab) => tab === requested);
  if (named !== undefined) return named;
  return isTakeSelected ? 'takes' : 'info';
}
