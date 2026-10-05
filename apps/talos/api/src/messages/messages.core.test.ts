import { describe, expect, it } from 'vitest';
import { buildMessageFileEdit, buildMessagePath } from './messages.core';

describe('buildMessagePath', () => {
  it('files a message in the inbox under its timestamp', () => {
    expect(buildMessagePath('2026-10-05-101230')).toBe('boite/messages/2026-10-05-101230.md');
  });
});

describe('buildMessageFileEdit', () => {
  it('writes a new message with its origin and date', () => {
    expect(buildMessageFileEdit(null, 'Rappelle Julie', '2026-10-05T08:12:30.000Z')).toEqual({
      content: '---\norigine: pwa\ndate: 2026-10-05T08:12:30.000Z\n---\n\nRappelle Julie\n',
      commitMessage: 'pwa : message pour Talos',
      outcome: { ok: true },
    });
  });

  it('appends to a message sent in the same second', () => {
    expect(buildMessageFileEdit('---\n---\n\npremier\n\n', 'second', 'x').content).toBe(
      '---\n---\n\npremier\n\nsecond\n',
    );
  });
});
