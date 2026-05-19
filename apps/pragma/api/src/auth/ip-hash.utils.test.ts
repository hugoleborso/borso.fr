import { describe, expect, it } from 'vitest';
import { UNKNOWN_IP_PLACEHOLDER, hashIp, readClientIp } from './ip-hash.utils';

describe('ip-hash.utils', () => {
  describe('readClientIp', () => {
    it('returns the unknown placeholder when the header is absent', () => {
      expect(readClientIp(undefined)).toBe(UNKNOWN_IP_PLACEHOLDER);
    });

    it('returns the unknown placeholder when the header is empty', () => {
      expect(readClientIp('')).toBe(UNKNOWN_IP_PLACEHOLDER);
    });

    it('returns the unknown placeholder when the header is only whitespace', () => {
      expect(readClientIp('   ')).toBe(UNKNOWN_IP_PLACEHOLDER);
    });

    it('returns the lone IP unchanged', () => {
      expect(readClientIp('203.0.113.1')).toBe('203.0.113.1');
    });

    it('extracts the first IP from a comma-separated list', () => {
      expect(readClientIp('203.0.113.1, 198.51.100.7, 10.0.0.1')).toBe('203.0.113.1');
    });

    it('trims whitespace around the first IP', () => {
      expect(readClientIp('   198.51.100.7   ,  10.0.0.1')).toBe('198.51.100.7');
    });
  });

  describe('hashIp', () => {
    it('produces a stable 64-character hex digest', () => {
      const digest = hashIp('203.0.113.1');
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces different digests for different inputs', () => {
      expect(hashIp('203.0.113.1')).not.toBe(hashIp('203.0.113.2'));
    });

    it('is deterministic across calls', () => {
      expect(hashIp('alpha')).toBe(hashIp('alpha'));
    });
  });
});
