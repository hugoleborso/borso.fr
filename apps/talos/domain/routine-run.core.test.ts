import { describe, expect, it } from 'vitest';
import { canSendMessage, messageTextSchema } from './routine-run.core';

// @FollowsBlueprint test-pure-unit
describe('messageTextSchema', () => {
  it('trims the message before measuring it', () => {
    expect(messageTextSchema.parse('  Rappelle Julie \n')).toBe('Rappelle Julie');
  });
});

describe('canSendMessage', () => {
  it.each([
    ['one character', 'a'],
    ['4000 characters', 'a'.repeat(4000)],
    ['4000 characters between spaces', ` ${'a'.repeat(4000)} `],
  ])('accepts %s', (_case, text) => {
    expect(canSendMessage(text)).toBe(true);
  });

  it.each([
    ['nothing', ''],
    ['spaces alone', ' \n\t '],
    ['4001 characters', 'a'.repeat(4001)],
    ['a NUL character', 'a\u0000b'],
  ])('refuses %s', (_case, text) => {
    expect(canSendMessage(text)).toBe(false);
  });
});
