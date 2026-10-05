import { describe, expect, it } from 'vitest';
import { selectSessionGateState } from './session-gate.core';

describe('selectSessionGateState', () => {
  it('waits while the probe has not answered', () => {
    expect(selectSessionGateState(true, undefined)).toBe('checking');
  });

  it('asks to sign in when the probe failed without an answer', () => {
    expect(selectSessionGateState(false, undefined)).toBe('sign-in-required');
  });

  it('follows the answer once there is one', () => {
    expect(selectSessionGateState(false, true)).toBe('granted');
    expect(selectSessionGateState(false, false)).toBe('sign-in-required');
  });
});
