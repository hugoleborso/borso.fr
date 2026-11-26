import { describe, expect, it } from 'vitest';
import { isSubmitDisabled } from './form-submit.utils';

// @FollowsBlueprint test-pure-unit
describe('isSubmitDisabled', () => {
  it('is enabled only when the form can submit and is idle', () => {
    expect(isSubmitDisabled(true, false)).toBe(false);
  });

  it('is disabled while the form cannot submit', () => {
    expect(isSubmitDisabled(false, false)).toBe(true);
  });

  it('is disabled while the form is submitting', () => {
    expect(isSubmitDisabled(true, true)).toBe(true);
  });

  it('is disabled when the subscription has not produced a value yet', () => {
    expect(isSubmitDisabled(undefined, undefined)).toBe(true);
  });

  it('treats an absent submitting flag as not blocking', () => {
    expect(isSubmitDisabled(true, undefined)).toBe(false);
  });
});
