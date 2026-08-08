import { describe, expect, it } from 'vitest';
import { isSubmitDisabled, isSubmitDisabledWhilePending } from './form-submit.utils';

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

describe('isSubmitDisabledWhilePending', () => {
  it('is enabled when the form is ready and no mutation is in flight', () => {
    expect(isSubmitDisabledWhilePending(true, false, false)).toBe(false);
  });

  it('is disabled while a mutation is in flight', () => {
    expect(isSubmitDisabledWhilePending(true, false, true)).toBe(true);
  });

  it('is disabled while the form itself is not ready', () => {
    expect(isSubmitDisabledWhilePending(false, false, false)).toBe(true);
  });
});
