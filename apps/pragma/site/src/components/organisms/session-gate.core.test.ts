import { describe, expect, it } from 'vitest';
import { selectSessionGateState } from './session-gate.core';

// @FollowsBlueprint test-pure-unit
describe('selectSessionGateState', () => {
  it('asks for a sign-in without ever probing when the browser has no marker', () => {
    expect(selectSessionGateState(false, true, undefined)).toBe('sign-in-required');
    expect(selectSessionGateState(false, false, true)).toBe('sign-in-required');
  });

  it('waits while the probe is in flight', () => {
    expect(selectSessionGateState(true, true, undefined)).toBe('checking');
  });

  it('asks for a sign-in when the probe finished without an answer', () => {
    expect(selectSessionGateState(true, false, undefined)).toBe('sign-in-required');
  });

  it('grants access when the probe says the cookie is valid', () => {
    expect(selectSessionGateState(true, false, true)).toBe('granted');
  });

  it('asks for a sign-in when the probe says the cookie is not valid', () => {
    expect(selectSessionGateState(true, false, false)).toBe('sign-in-required');
  });
});
