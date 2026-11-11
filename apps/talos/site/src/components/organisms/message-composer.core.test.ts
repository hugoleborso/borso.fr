import { describe, expect, it } from 'vitest';
import {
  isEnvironmentLinked,
  isMessageTooLong,
  isMessageTooLongToSend,
  LONG_MESSAGE_THRESHOLD,
} from './message-composer.core';

describe('isMessageTooLong', () => {
  it('warns only beyond the threshold', () => {
    expect(isMessageTooLong('x'.repeat(LONG_MESSAGE_THRESHOLD))).toBe(false);
    expect(isMessageTooLong('x'.repeat(LONG_MESSAGE_THRESHOLD + 1))).toBe(true);
  });
});

describe('isEnvironmentLinked', () => {
  it('always links the build environment', () => {
    expect(isEnvironmentLinked('build', true)).toBe(true);
    expect(isEnvironmentLinked('build', false)).toBe(true);
  });

  it('links the reading environment only while the routine is not configured', () => {
    expect(isEnvironmentLinked('talos', true)).toBe(false);
    expect(isEnvironmentLinked('talos', false)).toBe(true);
  });
});

describe('isMessageTooLongToSend', () => {
  it('holds only beyond the 4000 characters the routine accepts, spaces around left out', () => {
    expect(isMessageTooLongToSend('', true)).toBe(false);
    expect(isMessageTooLongToSend(` ${'x'.repeat(4000)} `, true)).toBe(false);
    expect(isMessageTooLongToSend('x'.repeat(4001), true)).toBe(true);
  });

  it('never holds while the routine is not configured, since the link takes the message', () => {
    expect(isMessageTooLongToSend('x'.repeat(4001), false)).toBe(false);
  });
});
