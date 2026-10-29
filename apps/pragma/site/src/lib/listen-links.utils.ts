/**
 * @DependsOnExternal deezer
 * @DependsOnExternal spotify
 * @DependsOnExternal youtube
 * @Feature songs
 */

const DEEZER_TRACK_ORIGIN = 'https://www.deezer.com/track';
const DEEZER_SEARCH_ORIGIN = 'https://www.deezer.com/search';
const SPOTIFY_TRACK_ORIGIN = 'https://open.spotify.com/track';
const SPOTIFY_SEARCH_ORIGIN = 'https://open.spotify.com/search';

export type ListenProvider = 'deezer' | 'spotify';

export interface ListenSubject {
  readonly title: string;
  readonly artist: string;
  readonly deezerTrackId: string | null;
  readonly spotifyTrackId: string | null;
}

export interface ListenTarget {
  readonly provider: ListenProvider;
  readonly address: string;
  readonly isExact: boolean;
}

export function buildSearchTerms(subject: ListenSubject): string {
  return `${subject.artist} ${subject.title}`.trim().replace(/\s+/g, ' ');
}

function namedTrackId(rawTrackId: string | null): string | null {
  const trackId = rawTrackId?.trim() ?? '';
  return trackId === '' ? null : trackId;
}

export function buildDeezerTarget(subject: ListenSubject): ListenTarget {
  const trackId = namedTrackId(subject.deezerTrackId);
  if (trackId !== null) {
    return {
      provider: 'deezer',
      address: `${DEEZER_TRACK_ORIGIN}/${encodeURIComponent(trackId)}`,
      isExact: true,
    };
  }
  return {
    provider: 'deezer',
    address: `${DEEZER_SEARCH_ORIGIN}/${encodeURIComponent(buildSearchTerms(subject))}`,
    isExact: false,
  };
}

export function buildSpotifyTarget(subject: ListenSubject): ListenTarget {
  const trackId = namedTrackId(subject.spotifyTrackId);
  if (trackId !== null) {
    return {
      provider: 'spotify',
      address: `${SPOTIFY_TRACK_ORIGIN}/${encodeURIComponent(trackId)}`,
      isExact: true,
    };
  }
  return {
    provider: 'spotify',
    address: `${SPOTIFY_SEARCH_ORIGIN}/${encodeURIComponent(buildSearchTerms(subject))}`,
    isExact: false,
  };
}

export type SongListenProvider = 'deezer' | 'spotify' | 'youtube' | 'other';

export interface SongListenLink {
  readonly provider: SongListenProvider;
  readonly address: string;
}

export interface SongListenSource extends ListenSubject {
  readonly links: readonly { readonly url: string; readonly provider: SongListenProvider }[];
}

function collectDistinctLinks(candidates: readonly SongListenLink[]): SongListenLink[] {
  const distinct: SongListenLink[] = [];
  for (const candidate of candidates) {
    if (!distinct.some((known) => known.address === candidate.address)) distinct.push(candidate);
  }
  return distinct;
}

function toListenLink(target: ListenTarget): SongListenLink {
  return { provider: target.provider, address: target.address };
}

export function selectSongListenLinks(song: SongListenSource): readonly SongListenLink[] {
  const deezer = buildDeezerTarget(song);
  const spotify = buildSpotifyTarget(song);
  const storedLinks = song.links.map((link) => ({ provider: link.provider, address: link.url }));
  const hasStoredSpotifyLink = storedLinks.some((link) => link.provider === 'spotify');
  const isSpotifyLinkShown = spotify.isExact || !hasStoredSpotifyLink;
  return collectDistinctLinks([
    ...(deezer.isExact ? [toListenLink(deezer)] : []),
    ...(isSpotifyLinkShown ? [toListenLink(spotify)] : []),
    ...storedLinks,
  ]);
}
