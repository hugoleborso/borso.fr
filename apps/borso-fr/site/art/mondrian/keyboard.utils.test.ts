import { describe, expect, it } from 'vitest';
import { isComposeKeyEvent } from './keyboard.utils';

describe('isComposeKeyEvent', () => {
  it('returns true for a Space keydown on the document body', () => {
    const event = new KeyboardEvent('keydown', { code: 'Space' });
    document.body.appendChild(document.createElement('div'));
    Object.defineProperty(event, 'target', { value: document.body });
    expect(isComposeKeyEvent(event)).toBe(true);
  });

  it('returns false for non-Space keys', () => {
    const event = new KeyboardEvent('keydown', { code: 'Enter' });
    Object.defineProperty(event, 'target', { value: document.body });
    expect(isComposeKeyEvent(event)).toBe(false);
  });

  it('returns false when typing inside an <input>', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = new KeyboardEvent('keydown', { code: 'Space' });
    Object.defineProperty(event, 'target', { value: input });
    expect(isComposeKeyEvent(event)).toBe(false);
  });

  it('returns false when typing inside a <textarea>', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const event = new KeyboardEvent('keydown', { code: 'Space' });
    Object.defineProperty(event, 'target', { value: textarea });
    expect(isComposeKeyEvent(event)).toBe(false);
  });

  it('returns true for a non-HTMLElement target (defensive)', () => {
    const event = new KeyboardEvent('keydown', { code: 'Space' });
    Object.defineProperty(event, 'target', { value: null });
    expect(isComposeKeyEvent(event)).toBe(true);
  });
});
