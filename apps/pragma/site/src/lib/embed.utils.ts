/**
 * @DependsOnExternal youtube
 * @DependsOnExternal spotify
 * @DependsOnExternal vimeo
 * @DependsOnExternal soundcloud
 * @DependsOnExternal deezer
 * @DependsOnExternal soundslice
 * @Feature songs
 */

const YOUTUBE_DOMAINS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const SPOTIFY_HOST = 'open.spotify.com';
const DEEZER_HOST = 'deezer.com';
const VIMEO_HOST = 'vimeo.com';
const SOUNDCLOUD_HOST = 'soundcloud.com';
const SOUNDSLICE_HOST = 'www.soundslice.com';

const YOUTUBE_IFRAME_WIDTH = 560;
const YOUTUBE_IFRAME_HEIGHT = 315;
const SPOTIFY_IFRAME_WIDTH = 300;
const SPOTIFY_IFRAME_HEIGHT = 380;
const VIMEO_IFRAME_WIDTH = 640;
const VIMEO_IFRAME_HEIGHT = 360;
const GENERIC_IFRAME_WIDTH = 480;
const GENERIC_IFRAME_HEIGHT = 320;

const SPOTIFY_KIND_AND_ID_SEGMENTS = 2;

export type EmbedResult =
  | {
      kind: 'oembed';
      provider: 'youtube' | 'spotify' | 'deezer' | 'vimeo' | 'soundcloud' | 'soundslice';
      iframeSrc: string;
      width: number;
      height: number;
    }
  | { kind: 'plain'; href: string };

function tryParse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function pathSegments(sourceUrl: URL): readonly string[] {
  return sourceUrl.pathname.split('/').filter((segment) => segment.length > 0);
}

function youtubeEmbed(sourceUrl: URL): EmbedResult | null {
  if (sourceUrl.host === 'youtu.be') {
    const [videoId] = sourceUrl.pathname.slice(1).split('/');
    if (videoId === '') return null;
    return {
      kind: 'oembed',
      provider: 'youtube',
      iframeSrc: `https://www.youtube.com/embed/${videoId}`,
      width: YOUTUBE_IFRAME_WIDTH,
      height: YOUTUBE_IFRAME_HEIGHT,
    };
  }
  if (sourceUrl.pathname === '/watch') {
    const videoId = sourceUrl.searchParams.get('v') ?? '';
    if (videoId === '') return null;
    return {
      kind: 'oembed',
      provider: 'youtube',
      iframeSrc: `https://www.youtube.com/embed/${videoId}`,
      width: YOUTUBE_IFRAME_WIDTH,
      height: YOUTUBE_IFRAME_HEIGHT,
    };
  }
  return null;
}

function spotifyEmbed(sourceUrl: URL): EmbedResult | null {
  const segments = pathSegments(sourceUrl);
  if (segments.length < SPOTIFY_KIND_AND_ID_SEGMENTS) return null;
  const [mediaType, mediaId] = segments;
  return {
    kind: 'oembed',
    provider: 'spotify',
    iframeSrc: `https://open.spotify.com/embed/${mediaType}/${mediaId}`,
    width: SPOTIFY_IFRAME_WIDTH,
    height: SPOTIFY_IFRAME_HEIGHT,
  };
}

const DEEZER_MEDIA_TYPES = new Set(['track', 'album', 'playlist']);

function deezerWidget(mediaType: string, mediaId: string): EmbedResult {
  return {
    kind: 'oembed',
    provider: 'deezer',
    iframeSrc: `https://widget.deezer.com/widget/dark/${mediaType}/${mediaId}`,
    width: SPOTIFY_IFRAME_WIDTH,
    height: SPOTIFY_IFRAME_HEIGHT,
  };
}

const DEEZER_OPTIONAL_LANGUAGE_PREFIX_SEGMENTS = 1;

function deezerEmbed(sourceUrl: URL): EmbedResult | null {
  const segments = pathSegments(sourceUrl);
  const mediaTypeIndex = segments.findIndex((segment) => DEEZER_MEDIA_TYPES.has(segment));
  if (mediaTypeIndex > DEEZER_OPTIONAL_LANGUAGE_PREFIX_SEGMENTS) return null;
  const mediaType = segments[mediaTypeIndex];
  const mediaId = segments[mediaTypeIndex + 1];
  if (mediaType === undefined || mediaId === undefined) return null;
  return deezerWidget(mediaType, mediaId);
}

function vimeoEmbed(sourceUrl: URL): EmbedResult | null {
  const [firstSegment] = pathSegments(sourceUrl);
  const videoId = firstSegment?.match(/^\d+$/)?.[0];
  if (videoId === undefined) return null;
  return {
    kind: 'oembed',
    provider: 'vimeo',
    iframeSrc: `https://player.vimeo.com/video/${videoId}`,
    width: VIMEO_IFRAME_WIDTH,
    height: VIMEO_IFRAME_HEIGHT,
  };
}

const SOUNDCLOUD_WIDGET_ENDPOINT = 'https://w.soundcloud.com/player/?url=';

function soundcloudEmbed(sourceUrl: URL): EmbedResult {
  const iframeSrc = `${SOUNDCLOUD_WIDGET_ENDPOINT}${encodeURIComponent(sourceUrl.toString())}`;
  return {
    kind: 'oembed',
    provider: 'soundcloud',
    iframeSrc,
    width: GENERIC_IFRAME_WIDTH,
    height: GENERIC_IFRAME_HEIGHT,
  };
}

function soundsliceEmbed(sourceUrl: URL): EmbedResult | null {
  const [slicesSegment, slug] = pathSegments(sourceUrl);
  if (slicesSegment !== 'slices' || slug === undefined) return null;
  return {
    kind: 'oembed',
    provider: 'soundslice',
    iframeSrc: `https://www.soundslice.com/slices/${slug}/embed/`,
    width: GENERIC_IFRAME_WIDTH,
    height: GENERIC_IFRAME_HEIGHT,
  };
}

// @FollowsBlueprint utils-pure-module
export function resolveEmbed(url: string): EmbedResult {
  const sourceUrl = tryParse(url);
  if (sourceUrl === null) return { kind: 'plain', href: url };

  if (YOUTUBE_DOMAINS.has(sourceUrl.host)) {
    const embed = youtubeEmbed(sourceUrl);
    if (embed !== null) return embed;
  }
  if (sourceUrl.host === SPOTIFY_HOST) {
    const embed = spotifyEmbed(sourceUrl);
    if (embed !== null) return embed;
  }
  if (sourceUrl.host === DEEZER_HOST || sourceUrl.host === `www.${DEEZER_HOST}`) {
    const embed = deezerEmbed(sourceUrl);
    if (embed !== null) return embed;
  }
  if (sourceUrl.host === VIMEO_HOST || sourceUrl.host === `player.${VIMEO_HOST}`) {
    const embed = vimeoEmbed(sourceUrl);
    if (embed !== null) return embed;
  }
  if (sourceUrl.host === SOUNDCLOUD_HOST || sourceUrl.host === `www.${SOUNDCLOUD_HOST}`) {
    return soundcloudEmbed(sourceUrl);
  }
  if (sourceUrl.host === SOUNDSLICE_HOST) {
    const embed = soundsliceEmbed(sourceUrl);
    if (embed !== null) return embed;
  }

  return { kind: 'plain', href: url };
}
