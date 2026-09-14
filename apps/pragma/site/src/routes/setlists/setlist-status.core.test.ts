import { describe, expect, it } from 'vitest';
import { resolveSetlistStatus } from './setlist-status.core';

// @FollowsBlueprint test-pure-unit
describe('resolveSetlistStatus', () => {
  it('reads a setlist with no status as locked', () => {
    expect(resolveSetlistStatus(null)).toBe('locked');
    expect(resolveSetlistStatus(undefined)).toBe('locked');
  });

  it('reads the voting phase back', () => {
    expect(resolveSetlistStatus('voting')).toBe('voting');
  });

  it('reads a status the application does not know as locked', () => {
    expect(resolveSetlistStatus('counting')).toBe('locked');
  });
});
