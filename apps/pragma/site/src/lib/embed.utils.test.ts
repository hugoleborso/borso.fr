import { describe, expect, it } from 'vitest';
import { resolveEmbed } from './embed.utils';

// @FollowsBlueprint test-pure-unit
describe('resolveEmbed — YouTube', () => {
  it('extracts the video id from a watch URL', () => {
    const embed = resolveEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(embed).toEqual({
      kind: 'oembed',
      provider: 'youtube',
      iframeSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      width: 560,
      height: 315,
    });
  });

  it('extracts the video id from a youtu.be short URL', () => {
    const embed = resolveEmbed('https://youtu.be/dQw4w9WgXcQ');
    expect(embed).toEqual({
      kind: 'oembed',
      provider: 'youtube',
      iframeSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      width: 560,
      height: 315,
    });
  });

  it('ignores a v parameter carried by a YouTube path other than /watch', () => {
    const url = 'https://www.youtube.com/playlist?list=PL123&v=dQw4w9WgXcQ';
    expect(resolveEmbed(url)).toEqual({ kind: 'plain', href: url });
  });

  it('does not read a /watch?v= URL served by another host as YouTube', () => {
    const url = 'https://example.com/watch?v=dQw4w9WgXcQ';
    expect(resolveEmbed(url)).toEqual({ kind: 'plain', href: url });
  });

  it('falls back to plain when no v= parameter is present', () => {
    const embed = resolveEmbed('https://www.youtube.com/watch');
    expect(embed).toEqual({ kind: 'plain', href: 'https://www.youtube.com/watch' });
  });

  it('handles m.youtube.com', () => {
    const embed = resolveEmbed('https://m.youtube.com/watch?v=abc123');
    expect(embed.kind).toBe('oembed');
  });

  it('rejects a youtu.be URL with no path', () => {
    const embed = resolveEmbed('https://youtu.be/');
    expect(embed.kind).toBe('plain');
  });

  it('falls back to plain for a YouTube page that is not a single video', () => {
    const playlistUrl = 'https://www.youtube.com/playlist?list=PL123';
    const channelUrl = 'https://www.youtube.com/@someband';
    expect(resolveEmbed(playlistUrl)).toEqual({ kind: 'plain', href: playlistUrl });
    expect(resolveEmbed(channelUrl).kind).toBe('plain');
  });
});

describe('resolveEmbed — Spotify', () => {
  it('builds an embed URL from /track/<id>', () => {
    const embed = resolveEmbed('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
    expect(embed).toEqual({
      kind: 'oembed',
      provider: 'spotify',
      iframeSrc: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
      width: 300,
      height: 380,
    });
  });

  it('builds an embed URL from /album/<id>', () => {
    const embed = resolveEmbed('https://open.spotify.com/album/abc');
    expect(embed.kind).toBe('oembed');
    if (embed.kind !== 'oembed') return;
    expect(embed.iframeSrc).toContain('/embed/album/abc');
  });

  it('falls back to plain on a single-segment path', () => {
    const embed = resolveEmbed('https://open.spotify.com/track');
    expect(embed.kind).toBe('plain');
  });
});

describe('resolveEmbed — Deezer', () => {
  it('builds an embed URL from /<type>/<id>', () => {
    const embed = resolveEmbed('https://deezer.com/track/123456');
    expect(embed.kind).toBe('oembed');
    if (embed.kind !== 'oembed') return;
    expect(embed.iframeSrc).toBe('https://widget.deezer.com/widget/dark/track/123456');
  });

  it('builds an embed URL from /<lang>/<type>/<id>', () => {
    const embed = resolveEmbed('https://www.deezer.com/fr/playlist/9999');
    expect(embed).toEqual({
      kind: 'oembed',
      provider: 'deezer',
      iframeSrc: 'https://widget.deezer.com/widget/dark/playlist/9999',
      width: 300,
      height: 380,
    });
  });

  it('falls back to plain when the language segment is followed by a type but no id', () => {
    expect(resolveEmbed('https://deezer.com/fr/track').kind).toBe('plain');
  });

  it('falls back to plain when neither of the first two segments is a media type', () => {
    expect(resolveEmbed('https://deezer.com/fr/foo/1').kind).toBe('plain');
  });

  it('falls back to plain when the media type sits deeper than the language segment', () => {
    expect(resolveEmbed('https://deezer.com/fr/profile/track/9').kind).toBe('plain');
  });

  it('does not read a deezer-shaped path served by another host as Deezer', () => {
    const url = 'https://example.com/track/123456';
    expect(resolveEmbed(url)).toEqual({ kind: 'plain', href: url });
  });

  it('falls back to plain on an unknown type segment', () => {
    const embed = resolveEmbed('https://deezer.com/foo/1');
    expect(embed.kind).toBe('plain');
  });

  it('falls back to plain when id segment is empty', () => {
    const embed = resolveEmbed('https://deezer.com/track');
    expect(embed.kind).toBe('plain');
  });
});

describe('resolveEmbed — Vimeo', () => {
  it('builds an embed URL from /<numericId>', () => {
    const embed = resolveEmbed('https://vimeo.com/123456789');
    expect(embed).toEqual({
      kind: 'oembed',
      provider: 'vimeo',
      iframeSrc: 'https://player.vimeo.com/video/123456789',
      width: 640,
      height: 360,
    });
  });

  it('recognises the player subdomain', () => {
    const embed = resolveEmbed('https://player.vimeo.com/123456789');
    expect(embed.kind).toBe('oembed');
  });

  it('falls back when the path is non-numeric', () => {
    const embed = resolveEmbed('https://vimeo.com/channels/something');
    expect(embed.kind).toBe('plain');
  });

  it('falls back when digits only start the first segment', () => {
    expect(resolveEmbed('https://vimeo.com/123abc').kind).toBe('plain');
  });

  it('falls back when digits only end the first segment', () => {
    expect(resolveEmbed('https://vimeo.com/abc123').kind).toBe('plain');
  });

  it('falls back on empty path', () => {
    const embed = resolveEmbed('https://vimeo.com/');
    expect(embed.kind).toBe('plain');
  });

  it('does not read a numeric path served by another host as Vimeo', () => {
    const url = 'https://example.com/123456789';
    expect(resolveEmbed(url)).toEqual({ kind: 'plain', href: url });
  });
});

describe('resolveEmbed — SoundCloud', () => {
  it('always returns the widget embed for a soundcloud URL', () => {
    const url = 'https://soundcloud.com/artist/track-slug';
    const embed = resolveEmbed(url);
    expect(embed.kind).toBe('oembed');
    if (embed.kind !== 'oembed') return;
    expect(embed.provider).toBe('soundcloud');
    expect(embed.iframeSrc).toContain('w.soundcloud.com');
    expect(embed.iframeSrc).toContain(encodeURIComponent(url));
  });

  it('recognises the www subdomain', () => {
    const embed = resolveEmbed('https://www.soundcloud.com/artist/track-slug');
    expect(embed.kind).toBe('oembed');
  });
});

describe('resolveEmbed — Soundslice', () => {
  it('builds an embed URL from /slices/<slug>', () => {
    const embed = resolveEmbed('https://www.soundslice.com/slices/abc123/');
    expect(embed).toEqual({
      kind: 'oembed',
      provider: 'soundslice',
      iframeSrc: 'https://www.soundslice.com/slices/abc123/embed/',
      width: 480,
      height: 320,
    });
  });

  it('falls back to plain on a non-slice path', () => {
    const embed = resolveEmbed('https://www.soundslice.com/courses/abc');
    expect(embed.kind).toBe('plain');
  });

  it('falls back to plain when the slice slug is missing', () => {
    const embed = resolveEmbed('https://www.soundslice.com/slices/');
    expect(embed.kind).toBe('plain');
  });

  it('does not read a slice-shaped path served by another host as Soundslice', () => {
    const url = 'https://example.com/slices/abc123';
    expect(resolveEmbed(url)).toEqual({ kind: 'plain', href: url });
  });
});

describe('resolveEmbed — unsupported / malformed', () => {
  it('returns plain on a malformed URL', () => {
    const embed = resolveEmbed('not a url');
    expect(embed).toEqual({ kind: 'plain', href: 'not a url' });
  });

  it('returns plain on a generic blog link', () => {
    const embed = resolveEmbed('https://example.com/article');
    expect(embed).toEqual({ kind: 'plain', href: 'https://example.com/article' });
  });
});
