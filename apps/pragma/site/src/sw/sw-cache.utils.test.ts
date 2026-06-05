import { describe, expect, it } from 'vitest';
import { isReadableApiPath } from './sw-cache.utils';

describe('sw-cache.utils', () => {
  describe('isReadableApiPath', () => {
    it('caches the catalog list', () => {
      expect(isReadableApiPath('/api/songs')).toBe(true);
    });

    it('caches a single-song detail', () => {
      expect(isReadableApiPath('/api/songs/00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('caches the sessions list + detail', () => {
      expect(isReadableApiPath('/api/sessions')).toBe(true);
      expect(isReadableApiPath('/api/sessions/abc-123')).toBe(true);
    });

    it('caches the setlist lookup by session', () => {
      expect(isReadableApiPath('/api/setlists/by-session/abc')).toBe(true);
    });

    it('caches the setlist entries list', () => {
      expect(isReadableApiPath('/api/setlists/abc/entries')).toBe(true);
    });

    it('caches the instruments + members lists', () => {
      expect(isReadableApiPath('/api/instruments')).toBe(true);
      expect(isReadableApiPath('/api/members')).toBe(true);
    });

    it('caches the offline-manifest endpoint (SW reads it on every fetch)', () => {
      expect(isReadableApiPath('/api/offline-manifest')).toBe(true);
    });

    it('does not cache mutation-only endpoints', () => {
      expect(isReadableApiPath('/api/auth/login')).toBe(false);
      expect(isReadableApiPath('/api/admin/rotate-password')).toBe(false);
      expect(isReadableApiPath('/api/mastery/defaults')).toBe(false);
    });

    it('does not cache an unknown path', () => {
      expect(isReadableApiPath('/api/whatever')).toBe(false);
      expect(isReadableApiPath('/api/songs/extra/segments')).toBe(false);
    });

    it('does not cache the root', () => {
      expect(isReadableApiPath('/')).toBe(false);
    });
  });
});
