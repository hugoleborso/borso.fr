import { describe, expect, it } from 'vitest';
import { quoteForShell } from './shell-quote.core.ts';

// @FollowsBlueprint test-pure-unit
describe("quoteForShell writes what bash's printf %q wrote", () => {
  it('keeps a path of safe characters as it is', () => {
    expect(quoteForShell('/tmp/claude-session.Ab12_x')).toBe('/tmp/claude-session.Ab12_x');
    expect(quoteForShell('a=b:d@e%f+g~h#i')).toBe('a=b:d@e%f+g~h#i');
  });

  it('escapes every other printable character, and a leading tilde or hash', () => {
    expect(quoteForShell('a b,c')).toBe('a\\ b\\,c');
    expect(quoteForShell('~x')).toBe('\\~x');
    expect(quoteForShell('#x')).toBe('\\#x');
    expect(quoteForShell("it's")).toBe("it\\'s");
  });

  it('quotes an empty string', () => {
    expect(quoteForShell('')).toBe("''");
  });

  it('writes a control character or a non-ASCII letter as an ANSI-C string of bytes', () => {
    expect(quoteForShell("a\u0007\b\u001b\f\v\u0001\t\r\n'\\ b")).toBe(
      "$'a\\a\\b\\E\\f\\v\\001\\t\\r\\n\\'\\\\ b'",
    );
    expect(quoteForShell('é x')).toBe("$'\\303\\251 x'");
    expect(quoteForShell('\u007f')).toBe("$'\\177'");
  });
});
