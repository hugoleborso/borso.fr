import { describe, expect, it } from 'vitest';
import { selectLabel } from './label.utils';

// @FollowsBlueprint test-pure-unit
describe('selectLabel', () => {
  it('returns the first label when the claim holds', () => {
    expect(selectLabel(true, 'admin.signing-in', 'admin.sign-in')).toBe('admin.signing-in');
  });

  it('returns the second label when the claim does not hold', () => {
    expect(selectLabel(false, 'admin.signing-in', 'admin.sign-in')).toBe('admin.sign-in');
  });
});
