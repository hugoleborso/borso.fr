/** @Feature songs */

export const SONG_VIEW_TAB_PARAM = 'tab';
export const SONG_VIEW_TABS = ['info', 'lineup', 'chords', 'takes'] as const;
export type SongViewTab = (typeof SONG_VIEW_TABS)[number];
export const SONG_PAGE_TABS = ['info', 'chords', 'takes'] as const satisfies readonly SongViewTab[];
export type SongPageTab = (typeof SONG_PAGE_TABS)[number];

// @FollowsBlueprint core-decision
export function readSongPageTab(requested: string | null, isTakeSelected: boolean): SongPageTab {
  const named = SONG_PAGE_TABS.find((tab) => tab === requested);
  if (named !== undefined) return named;
  return isTakeSelected ? 'takes' : 'info';
}

export function readTakeCountOfTab(tab: SongViewTab, takeCount: number | null): number | null {
  return tab === 'takes' ? takeCount : null;
}
