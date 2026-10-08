import { describe, expect, it } from 'vitest';
import { isMessageTooLong, LONG_MESSAGE_THRESHOLD } from './message-composer.core';

describe('isMessageTooLong', () => {
  it('warns only beyond the threshold', () => {
    expect(isMessageTooLong('x'.repeat(LONG_MESSAGE_THRESHOLD))).toBe(false);
    expect(isMessageTooLong('x'.repeat(LONG_MESSAGE_THRESHOLD + 1))).toBe(true);
  });
});
