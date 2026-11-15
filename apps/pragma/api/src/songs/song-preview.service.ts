import { readDeezerTrackPreview } from './deezer.adapter';
import { findSongById } from './songs.repository';

export type SongPreviewOutcome =
  | { kind: 'ok'; previewUrl: string | null }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

// @FollowsBlueprint service-orchestration
export async function readSongPreview(id: string): Promise<SongPreviewOutcome> {
  const song = await findSongById(id);
  if (song === null) return { kind: 'not-found' };
  if (song.deezerTrackId === null) return { kind: 'ok', previewUrl: null };
  return await readDeezerTrackPreview(song.deezerTrackId);
}
