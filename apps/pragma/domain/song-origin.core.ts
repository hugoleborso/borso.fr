export const SONG_ORIGINS = ['cover', 'original'] as const;

export type SongOrigin = (typeof SONG_ORIGINS)[number];

export const DEFAULT_SONG_ORIGIN: SongOrigin = 'cover';

export function isSongOrigin(candidate: string | null): candidate is SongOrigin {
  return SONG_ORIGINS.some((origin) => origin === candidate);
}

// @FollowsBlueprint core-projection
export function resolveSongOrigin(storedOrigin: string | null): SongOrigin {
  return isSongOrigin(storedOrigin) ? storedOrigin : DEFAULT_SONG_ORIGIN;
}
