export const SONG_STATUSES = ['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready'] as const;

export type SongStatus = (typeof SONG_STATUSES)[number];
