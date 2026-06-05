import { describe, expect, it } from 'vitest';
import { buildOfflineManifest, manifestUrls, pickNextSession } from './manifest.utils';

const NOW = new Date('2026-05-20T00:00:00.000Z');

describe('pickNextSession', () => {
  it('returns null for an empty list', () => {
    expect(pickNextSession([], NOW)).toBeNull();
  });

  it('returns null when every session is in the past', () => {
    const sessions = [
      { id: 'a', date: '2026-05-01T00:00:00.000Z' },
      { id: 'b', date: '2026-04-01T00:00:00.000Z' },
    ];
    expect(pickNextSession(sessions, NOW)).toBeNull();
  });

  it('picks the soonest future session', () => {
    const sessions = [
      { id: 'far', date: '2026-12-01T00:00:00.000Z' },
      { id: 'soon', date: '2026-05-25T00:00:00.000Z' },
      { id: 'past', date: '2026-01-01T00:00:00.000Z' },
    ];
    const next = pickNextSession(sessions, NOW);
    expect(next?.id).toBe('soon');
  });

  it('breaks ties by id ascending', () => {
    const sessions = [
      { id: 'beta', date: '2026-05-25T00:00:00.000Z' },
      { id: 'alpha', date: '2026-05-25T00:00:00.000Z' },
    ];
    const next = pickNextSession(sessions, NOW);
    expect(next?.id).toBe('alpha');
  });

  it('treats sessions exactly at `now` as past (strictly > now)', () => {
    const sessions = [{ id: 'now', date: NOW.toISOString() }];
    expect(pickNextSession(sessions, NOW)).toBeNull();
  });
});

describe('buildOfflineManifest', () => {
  it('produces catalog + every song detail + the next session pair', () => {
    const manifest = buildOfflineManifest({
      catalogListUrl: '/api/songs',
      songs: [{ id: 's1' }, { id: 's2' }],
      sessions: [
        { id: 'past', date: '2026-01-01T00:00:00.000Z' },
        { id: 'next', date: '2026-06-01T00:00:00.000Z' },
      ],
      now: NOW,
    });
    expect(manifest.catalogListUrl).toBe('/api/songs');
    expect(manifest.songDetailUrls).toEqual(['/api/songs/s1', '/api/songs/s2']);
    expect(manifest.nextSessionUrl).toBe('/api/sessions/next');
    expect(manifest.nextSetlistUrl).toBe('/api/setlists/by-session/next');
  });

  it('returns null session URLs when no future session exists', () => {
    const manifest = buildOfflineManifest({
      catalogListUrl: '/api/songs',
      songs: [],
      sessions: [{ id: 'old', date: '2026-01-01T00:00:00.000Z' }],
      now: NOW,
    });
    expect(manifest.nextSessionUrl).toBeNull();
    expect(manifest.nextSetlistUrl).toBeNull();
  });

  it('handles empty songs list', () => {
    const manifest = buildOfflineManifest({
      catalogListUrl: '/api/songs',
      songs: [],
      sessions: [],
      now: NOW,
    });
    expect(manifest.songDetailUrls).toEqual([]);
  });
});

describe('manifestUrls', () => {
  it('flattens every present URL and drops null ones', () => {
    const urls = manifestUrls({
      catalogListUrl: '/api/songs',
      songDetailUrls: ['/api/songs/a'],
      nextSessionUrl: '/api/sessions/x',
      nextSetlistUrl: '/api/setlists/by-session/x',
    });
    expect(urls).toEqual([
      '/api/songs',
      '/api/songs/a',
      '/api/sessions/x',
      '/api/setlists/by-session/x',
    ]);
  });

  it('drops null next-session URLs', () => {
    const urls = manifestUrls({
      catalogListUrl: '/api/songs',
      songDetailUrls: [],
      nextSessionUrl: null,
      nextSetlistUrl: null,
    });
    expect(urls).toEqual(['/api/songs']);
  });
});
