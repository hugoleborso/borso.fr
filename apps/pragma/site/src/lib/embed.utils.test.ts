import { describe, expect, it } from 'vitest';
import { resolveEmbed } from './embed.utils';

describe('resolveEmbed — YouTube', () => {
  it('extracts the video id from a watch URL', () => {
    const result = resolveEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toEqual({
      kind: 'oembed',
      provider: 'youtube',
      iframeSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      width: 560,
      height: 315,
    });
  });

  it('extracts the video id from a youtu.be short URL', () => {
    const result = resolveEmbed('https://youtu.be/dQw4w9WgXcQ');
    expect(result.kind).toBe('oembed');
    if (result.kind !== 'oembed') return;
    expect(result.iframeSrc).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('falls back to plain when no v= parameter is present', () => {
    const result = resolveEmbed('https://www.youtube.com/watch');
    expect(result).toEqual({ kind: 'plain', href: 'https://www.youtube.com/watch' });
  });

  it('handles m.youtube.com', () => {
    const result = resolveEmbed('https://m.youtube.com/watch?v=abc123');
    expect(result.kind).toBe('oembed');
  });

  it('rejects a youtu.be URL with no path', () => {
    const result = resolveEmbed('https://youtu.be/');
    expect(result.kind).toBe('plain');
  });
});

describe('resolveEmbed — Spotify', () => {
  it('builds an embed URL from /track/<id>', () => {
    const result = resolveEmbed('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
    expect(result).toEqual({
      kind: 'oembed',
      provider: 'spotify',
      iframeSrc: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
      width: 300,
      height: 380,
    });
  });

  it('builds an embed URL from /album/<id>', () => {
    const result = resolveEmbed('https://open.spotify.com/album/abc');
    expect(result.kind).toBe('oembed');
    if (result.kind !== 'oembed') return;
    expect(result.iframeSrc).toContain('/embed/album/abc');
  });

  it('falls back to plain on a single-segment path', () => {
    const result = resolveEmbed('https://open.spotify.com/track');
    expect(result.kind).toBe('plain');
  });
});

describe('resolveEmbed — Deezer', () => {
  it('builds an embed URL from /<type>/<id>', () => {
    const result = resolveEmbed('https://deezer.com/track/123456');
    expect(result.kind).toBe('oembed');
    if (result.kind !== 'oembed') return;
    expect(result.iframeSrc).toBe('https://widget.deezer.com/widget/dark/track/123456');
  });

  it('builds an embed URL from /<lang>/<type>/<id>', () => {
    const result = resolveEmbed('https://www.deezer.com/fr/playlist/9999');
    expect(result.kind).toBe('oembed');
    if (result.kind !== 'oembed') return;
    expect(result.iframeSrc).toContain('/playlist/9999');
  });

  it('falls back to plain on an unknown type segment', () => {
    const result = resolveEmbed('https://deezer.com/foo/1');
    expect(result.kind).toBe('plain');
  });

  it('falls back to plain when id segment is empty', () => {
    const result = resolveEmbed('https://deezer.com/track');
    expect(result.kind).toBe('plain');
  });
});

describe('resolveEmbed — Vimeo', () => {
  it('builds an embed URL from /<numericId>', () => {
    const result = resolveEmbed('https://vimeo.com/123456789');
    expect(result.kind).toBe('oembed');
    if (result.kind !== 'oembed') return;
    expect(result.iframeSrc).toBe('https://player.vimeo.com/video/123456789');
  });

  it('falls back when the path is non-numeric', () => {
    const result = resolveEmbed('https://vimeo.com/channels/something');
    expect(result.kind).toBe('plain');
  });

  it('falls back on empty path', () => {
    const result = resolveEmbed('https://vimeo.com/');
    expect(result.kind).toBe('plain');
  });
});

describe('resolveEmbed — SoundCloud', () => {
  it('always returns the widget embed for a soundcloud URL', () => {
    const url = 'https://soundcloud.com/artist/track-slug';
    const result = resolveEmbed(url);
    expect(result.kind).toBe('oembed');
    if (result.kind !== 'oembed') return;
    expect(result.provider).toBe('soundcloud');
    expect(result.iframeSrc).toContain('w.soundcloud.com');
    expect(result.iframeSrc).toContain(encodeURIComponent(url));
  });
});

describe('resolveEmbed — Soundslice', () => {
  it('builds an embed URL from /slices/<slug>', () => {
    const result = resolveEmbed('https://www.soundslice.com/slices/abc123/');
    expect(result.kind).toBe('oembed');
    if (result.kind !== 'oembed') return;
    expect(result.iframeSrc).toBe('https://www.soundslice.com/slices/abc123/embed/');
  });

  it('falls back to plain on a non-slice path', () => {
    const result = resolveEmbed('https://www.soundslice.com/courses/abc');
    expect(result.kind).toBe('plain');
  });
});

describe('resolveEmbed — unsupported / malformed', () => {
  it('returns plain on a malformed URL', () => {
    const result = resolveEmbed('not a url');
    expect(result).toEqual({ kind: 'plain', href: 'not a url' });
  });

  it('returns plain on a generic blog link', () => {
    const result = resolveEmbed('https://example.com/article');
    expect(result).toEqual({ kind: 'plain', href: 'https://example.com/article' });
  });
});
