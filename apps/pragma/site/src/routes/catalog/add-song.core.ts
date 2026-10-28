/** @Feature songs */

import type { songStatuses } from './song-draft.core';

export type NewSongStatus = (typeof songStatuses)[number];

export interface PickedServiceTrack {
  readonly deezerTrackId: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  readonly deezerAlbumId: string | null;
  readonly durationSeconds: number | null;
  readonly isrcs: readonly string[];
}

export interface AddSongDraft {
  readonly title: string;
  readonly artist: string;
  readonly status: NewSongStatus;
  readonly pickedTrack: PickedServiceTrack | null;
}

export interface NewSongPayload {
  readonly title: string;
  readonly artist: string;
  readonly status: NewSongStatus;
  readonly album?: string | null;
  readonly deezerTrackId?: string;
  readonly deezerAlbumId?: string | null;
  readonly durationSeconds?: number | null;
  readonly isrcs?: string[];
}

const DEFAULT_NEW_SONG_STATUS: NewSongStatus = 'idea';
const SERVICE_SEARCH_MIN_LENGTH = 2;

export function startAddSongDraft(title: string): AddSongDraft {
  return { title, artist: '', status: DEFAULT_NEW_SONG_STATUS, pickedTrack: null };
}

// @FollowsBlueprint core-view-projection
export function applyPickedTrack(draft: AddSongDraft, track: PickedServiceTrack): AddSongDraft {
  return { ...draft, title: track.title, artist: track.artist, pickedTrack: track };
}

export function canAddSong(draft: AddSongDraft): boolean {
  return draft.title.trim().length > 0;
}

export function shouldSearchMusicServiceFor(
  title: string,
  pickedTrack: PickedServiceTrack | null,
): boolean {
  return pickedTrack === null && title.trim().length >= SERVICE_SEARCH_MIN_LENGTH;
}

export function buildNewSongPayload(draft: AddSongDraft): NewSongPayload {
  const named = { title: draft.title.trim(), artist: draft.artist.trim(), status: draft.status };
  const track = draft.pickedTrack;
  if (track === null) return named;
  return {
    ...named,
    album: track.album,
    deezerTrackId: track.deezerTrackId,
    deezerAlbumId: track.deezerAlbumId,
    durationSeconds: track.durationSeconds,
    isrcs: [...track.isrcs],
  };
}

export const ADD_SONG_PATH = '/catalog/add';
export const ADD_SONG_TITLE_PARAMETER = 'title';

// @FollowsBlueprint core-decision
export function buildAddSongPath(searchedTitle: string): string {
  const title = searchedTitle.trim();
  if (title.length === 0) return ADD_SONG_PATH;
  return `${ADD_SONG_PATH}?${new URLSearchParams({ [ADD_SONG_TITLE_PARAMETER]: title }).toString()}`;
}
