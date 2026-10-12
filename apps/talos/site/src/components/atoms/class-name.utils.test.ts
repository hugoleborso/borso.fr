import { describe, expect, it } from 'vitest';
import { composeClassName } from './class-name.utils';

describe('composeClassName', () => {
  it('joins the truthy class names and drops the falsy ones', () => {
    expect(composeClassName('a', false, undefined, 'b', { c: true, d: false })).toBe('a b c');
  });

  it('keeps the last of two classes that set the same property', () => {
    expect(composeClassName('w-full px-3', 'w-12')).toBe('px-3 w-12');
  });

  it('keeps a colour class beside a font-size token, which share the text- prefix', () => {
    expect(composeClassName('text-on-bronze', 'text-body')).toBe('text-on-bronze text-body');
  });

  it('keeps the last of two font-size tokens', () => {
    expect(composeClassName('text-body-sm', 'text-body')).toBe('text-body');
  });
});
