import { describe, expect, it } from 'vitest';
import { stripMarkdownCode } from './markdown-code.core.ts';

// @FollowsBlueprint test-pure-unit
describe('stripMarkdownCode, so a hook reads only the markup that renders', () => {
  it('drops a fenced block, its fences included, and keeps the line breaks around it', () => {
    expect(stripMarkdownCode('before\n```ts\n<details>\n```\nafter')).toBe('before\n\nafter');
  });

  it('drops a tilde fence and an indented fence', () => {
    expect(stripMarkdownCode('a\n  ~~~\n<img>\n  ~~~  \nb')).toBe('a\n\nb');
  });

  it('closes a fence only with the same run of marks', () => {
    expect(stripMarkdownCode('````\n```\n<b>\n````\nz')).toBe('\nz');
  });

  it('leaves an unclosed fence to the code span rule', () => {
    expect(stripMarkdownCode('```\n<b>')).toBe(' \n<b>');
  });

  it('replaces a code span, even one spanning lines or using several backticks, with a space', () => {
    expect(stripMarkdownCode('use `<br>` and ``a ` b`` and `x\ny`.')).toBe('use   and   and  .');
  });

  it('reads a carriage return as part of a line, as Python did', () => {
    expect(stripMarkdownCode('a\r```\nx\n```\n')).toBe('a\r \n');
  });
});
