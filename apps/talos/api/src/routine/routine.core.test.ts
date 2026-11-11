import { describe, expect, it } from 'vitest';
import { cutMessageSubject } from './routine.core';

// @FollowsBlueprint test-pure-unit
describe('cutMessageSubject', () => {
  it('keeps a message of 200 characters whole', () => {
    const message = 'a'.repeat(200);
    expect(cutMessageSubject(message)).toBe(message);
  });

  it('cuts a longer message to its first 200 characters', () => {
    expect(cutMessageSubject(`${'a'.repeat(200)}b`)).toBe('a'.repeat(200));
  });

  it('counts a character written on two code units once, and never cuts it in half', () => {
    const message = `${'a'.repeat(199)}🙂b`;
    expect(cutMessageSubject(message)).toBe(`${'a'.repeat(199)}🙂`);
  });
});
