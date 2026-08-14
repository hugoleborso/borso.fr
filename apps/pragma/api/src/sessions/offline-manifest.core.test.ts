import { describe, expect, it } from 'vitest';
import { buildNextSessionOfflineManifest } from './offline-manifest.core';

const NOW = new Date('2026-03-01T12:00:00.000Z');

// @FollowsBlueprint test-pure-unit
describe('buildNextSessionOfflineManifest', () => {
  it('treats a session starting exactly now as past, not upcoming', () => {
    const now = new Date('2025-06-01T20:00:00Z');
    const manifest = buildNextSessionOfflineManifest([{ id: 'a', date: now }], [], now);
    expect(manifest.nextSessionUrl).toBeNull();
    expect(manifest.nextSetlistUrl).toBeNull();
  });

  it('lists a detail url per song and points at the next future session', () => {
    const manifest = buildNextSessionOfflineManifest(
      [
        { id: 'past', date: new Date('2026-02-01T12:00:00.000Z') },
        { id: 'later', date: new Date('2026-05-01T12:00:00.000Z') },
        { id: 'soon', date: new Date('2026-03-02T12:00:00.000Z') },
      ],
      [{ id: 'song-1' }, { id: 'song-2' }],
      NOW,
    );
    expect(manifest).toEqual({
      catalogListUrl: '/api/songs',
      songDetailUrls: ['/api/songs/song-1', '/api/songs/song-2'],
      nextSessionUrl: '/api/sessions/soon',
      nextSetlistUrl: '/api/setlists/by-session/soon',
    });
  });

  it('breaks a date tie on the identifier so the choice is stable', () => {
    const sameDate = new Date('2026-03-02T12:00:00.000Z');
    const manifest = buildNextSessionOfflineManifest(
      [
        { id: 'bbb', date: sameDate },
        { id: 'aaa', date: sameDate },
      ],
      [],
      NOW,
    );
    expect(manifest.nextSessionUrl).toBe('/api/sessions/aaa');
  });

  it('carries no session urls when nothing is upcoming', () => {
    const manifest = buildNextSessionOfflineManifest(
      [{ id: 'past', date: new Date('2026-02-01T12:00:00.000Z') }],
      [],
      NOW,
    );
    expect(manifest.nextSessionUrl).toBeNull();
    expect(manifest.nextSetlistUrl).toBeNull();
  });
});
