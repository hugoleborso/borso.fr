import { describe, expect, it, vi } from 'vitest';
import { OPEN_READY_STATE, sendWhenOpen } from './local-socket.core';

// @FollowsBlueprint test-pure-unit
describe('sendWhenOpen', () => {
  it('sends through a socket that is open', () => {
    const send = vi.fn();
    sendWhenOpen({ readyState: OPEN_READY_STATE, send }, 'hello');
    expect(send).toHaveBeenCalledWith('hello');
  });

  it('sends nothing through a socket that is closing', () => {
    const send = vi.fn();
    sendWhenOpen({ readyState: OPEN_READY_STATE + 1, send }, 'hello');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when there is no socket at all', () => {
    expect(() => {
      sendWhenOpen(undefined, 'hello');
    }).not.toThrow();
  });
});
