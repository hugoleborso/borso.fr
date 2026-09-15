/**
 * @DependsOnExternal deezer
 */

const DEEZER_ALBUM_IMAGE_ORIGIN = 'https://api.deezer.com/album';
const THUMBNAIL_SIZE = 'medium';
const INITIALS_MAX = 2;
const HUE_DEGREES = 360;
const COVER_SATURATION_PERCENT = 46;
const COVER_LIGHTNESS_PERCENT = 62;
const HASH_SEED = 5_381;
const HASH_SHIFT = 5;

export function buildCoverArtUrl(deezerAlbumId: string | null): string | null {
  if (deezerAlbumId === null) return null;
  if (deezerAlbumId.trim() === '') return null;
  return `${DEEZER_ALBUM_IMAGE_ORIGIN}/${encodeURIComponent(deezerAlbumId)}/image?size=${THUMBNAIL_SIZE}`;
}

export function selectCoverInitials(title: string): string {
  const words = title
    .split(/\s/)
    .map((word) => word.replace(/[^\p{Letter}\p{Number}]/gu, ''))
    .filter((word) => word !== '');
  return words
    .slice(0, INITIALS_MAX)
    .map((word) => word.slice(0, 1).toUpperCase())
    .join('');
}

export function selectCoverColor(seed: string): string {
  let hash = HASH_SEED;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << HASH_SHIFT) - hash + seed.charCodeAt(i);
    hash = hash | 0;
  }
  const hue = Math.abs(hash) % HUE_DEGREES;
  return `hsl(${String(hue)} ${String(COVER_SATURATION_PERCENT)}% ${String(COVER_LIGHTNESS_PERCENT)}%)`;
}
