/**
 * @DependsOnExternal deezer
 * @DependsOnExternal spotify
 * @Feature songs
 */

const DEEZER_TRACK_ORIGIN = 'https://www.deezer.com/track';
const DEEZER_SEARCH_ORIGIN = 'https://www.deezer.com/search';
const SPOTIFY_TRACK_ORIGIN = 'https://open.spotify.com/track';
const SPOTIFY_SEARCH_ORIGIN = 'https://open.spotify.com/search';

export const LISTEN_PROVIDERS = ['deezer', 'spotify'] as const;

export type ListenProvider = (typeof LISTEN_PROVIDERS)[number];

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

export function selectListenTargets(subject: ListenSubject): readonly ListenTarget[] {
  return [buildDeezerTarget(subject), buildSpotifyTarget(subject)];
}
