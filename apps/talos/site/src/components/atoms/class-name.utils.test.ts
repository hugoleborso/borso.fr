import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { composeClassName } from './class-name.utils';

const TOKENS_STYLESHEET = join(process.cwd(), 'site/src/styles/tokens.css');
const FONT_SIZE_TOKEN_PATTERN = /--text-([a-z]+(?:-[a-z]+)*):/g;

function readFontSizeTokens(): string[] {
  return [...readFileSync(TOKENS_STYLESHEET, 'utf8').matchAll(FONT_SIZE_TOKEN_PATTERN)].map(
    (match) => match[1] ?? '',
  );
}

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

  it('reads the font-size tokens it checks from tokens.css', () => {
    expect(readFontSizeTokens()).toContain('body');
  });

  it.each(readFontSizeTokens())(
    'knows text-%s from tokens.css as a font size, so it never drops a text colour',
    (token) => {
      expect(composeClassName('text-on-bronze', `text-${token}`)).toBe(
        `text-on-bronze text-${token}`,
      );
    },
  );
});
