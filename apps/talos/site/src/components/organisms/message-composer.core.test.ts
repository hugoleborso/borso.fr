import { describe, expect, it } from 'vitest';
import { canSendMessage } from './message-composer.core';

describe('canSendMessage', () => {
  it('refuses a blank message and accepts any text', () => {
    expect(canSendMessage(' \n ')).toBe(false);
    expect(canSendMessage('Rappelle-moi')).toBe(true);
  });
});
