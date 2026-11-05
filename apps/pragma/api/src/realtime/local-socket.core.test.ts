import { describe, expect, it, vi } from 'vitest';
import { isSocketReplyAccepted, OPEN_READY_STATE, sendWhenOpen } from './local-socket.core';

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

describe('isSocketReplyAccepted', () => {
  it('accepts only the status the gateway reads as an accepted connection', () => {
    expect(isSocketReplyAccepted({ statusCode: 200 })).toBe(true);
    expect(isSocketReplyAccepted({ statusCode: 401 })).toBe(false);
    expect(isSocketReplyAccepted({ statusCode: 400 })).toBe(false);
  });
});
