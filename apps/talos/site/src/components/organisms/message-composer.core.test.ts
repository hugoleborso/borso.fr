import { describe, expect, it } from 'vitest';
import {
  isEnvironmentLinked,
  isMessageTooLong,
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
    expect(isEnvironmentLinked('build', false)).toBe(true);
    expect(isEnvironmentLinked('build', true)).toBe(true);
  });

  it('links the reading environment only while the routine is not configured', () => {
    expect(isEnvironmentLinked('talos', false)).toBe(false);
    expect(isEnvironmentLinked('talos', true)).toBe(true);
  });
});
