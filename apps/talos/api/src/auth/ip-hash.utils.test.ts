import { describe, expect, it } from 'vitest';
import { hashIp } from './ip-hash.utils';

// @FollowsBlueprint test-pure-unit
describe('ip-hash.utils', () => {
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
