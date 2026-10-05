import { describe, expect, it } from 'vitest';
import { messageSchema } from './messages.schema';

describe('messageSchema', () => {
  it('trims the text', () => {
    expect(messageSchema.parse({ text: '  Rappelle Julie ' })).toEqual({
      text: 'Rappelle Julie',
    });
  });

  it('refuses an empty text and one longer than five thousand characters', () => {
    expect(messageSchema.safeParse({ text: '   ' }).success).toBe(false);
    expect(messageSchema.safeParse({ text: 'x'.repeat(5001) }).success).toBe(false);
    expect(messageSchema.safeParse({ text: 'x'.repeat(5000) }).success).toBe(true);
  });
});
