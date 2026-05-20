/**
 * oEmbed iframe resolver for SongExternalLink URLs. Spec Q.O.D.
 * *Embeds* = iframes for Spotify, Deezer, YouTube (the spec's three
 * explicit providers), plus Vimeo, SoundCloud, Soundslice (close
 * cousins worth recognising). Unknown providers fall back to a plain
 * link.
 *
 * v1 ships hand-coded URL patterns rather than a live oEmbed call —
 * the known providers are stable, and an opaque oEmbed call would
 * block render. Pure utility, 100% coverage gated.
 */

const YOUTUBE_DOMAINS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
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

function youtubeEmbed(parsed: URL): EmbedResult | null {
  if (parsed.host === 'youtu.be') {
    const videoId = parsed.pathname.slice(1).split('/')[0] ?? '';
    if (videoId === '') return null;
    return {
      kind: 'oembed',
      provider: 'youtube',
      iframeSrc: `https://www.youtube.com/embed/${videoId}`,
      width: YOUTUBE_IFRAME_WIDTH,
      height: YOUTUBE_IFRAME_HEIGHT,
    };
  }
  if (parsed.pathname === '/watch') {
    const videoId = parsed.searchParams.get('v') ?? '';
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

function spotifyEmbed(parsed: URL): EmbedResult | null {
  // Spotify URL shape: /track/<id>, /album/<id>, /playlist/<id>.
  const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0);
  if (segments.length < 2) return null;
  return {
    kind: 'oembed',
    provider: 'spotify',
    iframeSrc: `https://open.spotify.com/embed/${segments[0]}/${segments[1]}`,
    width: SPOTIFY_IFRAME_WIDTH,
    height: SPOTIFY_IFRAME_HEIGHT,
  };
}

function deezerEmbed(parsed: URL): EmbedResult | null {
  // Deezer URL shape: /<lang>/<type>/<id> OR /<type>/<id>.
  const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0);
  const knownTypes = ['track', 'album', 'playlist'];
  let typeAndId: [string, string] | null = null;
  if (segments.length >= 2) {
    if (knownTypes.includes(segments[0] ?? '')) {
      typeAndId = [segments[0] ?? '', segments[1] ?? ''];
    } else if (segments.length >= 3 && knownTypes.includes(segments[1] ?? '')) {
      typeAndId = [segments[1] ?? '', segments[2] ?? ''];
    }
  }
  if (typeAndId === null || typeAndId[1] === '') return null;
  return {
    kind: 'oembed',
    provider: 'deezer',
    iframeSrc: `https://widget.deezer.com/widget/dark/${typeAndId[0]}/${typeAndId[1]}`,
    width: SPOTIFY_IFRAME_WIDTH,
    height: SPOTIFY_IFRAME_HEIGHT,
  };
}

function vimeoEmbed(parsed: URL): EmbedResult | null {
  const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0);
  const videoId = segments[0];
  if (videoId === undefined || !/^\d+$/.test(videoId)) return null;
  return {
    kind: 'oembed',
    provider: 'vimeo',
    iframeSrc: `https://player.vimeo.com/video/${videoId}`,
    width: VIMEO_IFRAME_WIDTH,
    height: VIMEO_IFRAME_HEIGHT,
  };
}

function soundcloudEmbed(parsed: URL): EmbedResult {
  // SoundCloud's iframe uses its widget endpoint; the URL is opaque on
  // purpose (the API resolves it).
  const iframeSrc = `https://w.soundcloud.com/player/?url=${encodeURIComponent(parsed.toString())}`;
  return {
    kind: 'oembed',
    provider: 'soundcloud',
    iframeSrc,
    width: GENERIC_IFRAME_WIDTH,
    height: GENERIC_IFRAME_HEIGHT,
  };
}

function soundsliceEmbed(parsed: URL): EmbedResult | null {
  // Soundslice slice URL: /slices/<slug>/
  const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0);
  if (segments[0] !== 'slices' || segments[1] === undefined) return null;
  return {
    kind: 'oembed',
    provider: 'soundslice',
    iframeSrc: `https://www.soundslice.com/slices/${segments[1]}/embed/`,
    width: GENERIC_IFRAME_WIDTH,
    height: GENERIC_IFRAME_HEIGHT,
  };
}

export function resolveEmbed(url: string): EmbedResult {
  const parsed = tryParse(url);
  if (parsed === null) return { kind: 'plain', href: url };

  if (YOUTUBE_DOMAINS.includes(parsed.host)) {
    const result = youtubeEmbed(parsed);
    if (result !== null) return result;
  }
  if (parsed.host === SPOTIFY_HOST) {
    const result = spotifyEmbed(parsed);
    if (result !== null) return result;
  }
  if (parsed.host === DEEZER_HOST || parsed.host === `www.${DEEZER_HOST}`) {
    const result = deezerEmbed(parsed);
    if (result !== null) return result;
  }
  if (parsed.host === VIMEO_HOST || parsed.host === `player.${VIMEO_HOST}`) {
    const result = vimeoEmbed(parsed);
    if (result !== null) return result;
  }
  if (parsed.host === SOUNDCLOUD_HOST || parsed.host === `www.${SOUNDCLOUD_HOST}`) {
    return soundcloudEmbed(parsed);
  }
  if (parsed.host === SOUNDSLICE_HOST) {
    const result = soundsliceEmbed(parsed);
    if (result !== null) return result;
  }

  return { kind: 'plain', href: url };
}
