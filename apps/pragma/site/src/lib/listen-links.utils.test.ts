import { describe, expect, it } from 'vitest';
import {
  buildDeezerTarget,
  buildSearchTerms,
  buildSpotifyTarget,
  type ListenSubject,
  selectListenTargets,
} from './listen-links.utils';

function subject(overrides: Partial<ListenSubject> = {}): ListenSubject {
  return {
    title: 'Get Lucky',
    artist: 'Daft Punk',
    deezerTrackId: '67238735',
    spotifyTrackId: null,
    ...overrides,
  };
}

describe('buildSearchTerms', () => {
  it('names the artist before the title, which is the order both services rank by', () => {
    expect(buildSearchTerms(subject())).toBe('Daft Punk Get Lucky');
  });

  it('collapses the gap a missing artist would leave', () => {
    expect(buildSearchTerms(subject({ artist: '' }))).toBe('Get Lucky');
  });

  it('collapses a run of spaces inside the terms', () => {
    expect(buildSearchTerms(subject({ artist: 'Daft   Punk' }))).toBe('Daft Punk Get Lucky');
  });
});

describe('buildDeezerTarget', () => {
  it('points straight at the track when the song names one', () => {
    expect(buildDeezerTarget(subject())).toEqual({
      provider: 'deezer',
      address: 'https://www.deezer.com/track/67238735',
      isExact: true,
    });
  });

  it('falls back to a search when the song names no track', () => {
    expect(buildDeezerTarget(subject({ deezerTrackId: null }))).toEqual({
      provider: 'deezer',
      address: 'https://www.deezer.com/search/Daft%20Punk%20Get%20Lucky',
      isExact: false,
    });
  });

  it('treats a blank track id as none', () => {
    expect(buildDeezerTarget(subject({ deezerTrackId: '   ' })).isExact).toBe(false);
  });

  it('escapes what a track id could carry', () => {
    expect(buildDeezerTarget(subject({ deezerTrackId: 'a/b' })).address).toBe(
      'https://www.deezer.com/track/a%2Fb',
    );
  });
});

describe('buildSpotifyTarget', () => {
  it('points straight at the track once the song names one', () => {
    expect(buildSpotifyTarget(subject({ spotifyTrackId: '2Foc5Q5nqNiosCNqttzHof' }))).toEqual({
      provider: 'spotify',
      address: 'https://open.spotify.com/track/2Foc5Q5nqNiosCNqttzHof',
      isExact: true,
    });
  });

  it('falls back to a search for a song Spotify never resolved', () => {
    expect(buildSpotifyTarget(subject())).toEqual({
      provider: 'spotify',
      address: 'https://open.spotify.com/search/Daft%20Punk%20Get%20Lucky',
      isExact: false,
    });
  });

  it('treats a blank track id as none', () => {
    expect(buildSpotifyTarget(subject({ spotifyTrackId: '   ' })).isExact).toBe(false);
  });

  it('escapes what a track id could carry', () => {
    expect(buildSpotifyTarget(subject({ spotifyTrackId: 'a/b' })).address).toBe(
      'https://open.spotify.com/track/a%2Fb',
    );
  });
});

describe('selectListenTargets', () => {
  it('offers Deezer first, which is where the identifiers come from', () => {
    expect(selectListenTargets(subject()).map((target) => target.provider)).toEqual([
      'deezer',
      'spotify',
    ]);
  });
});
