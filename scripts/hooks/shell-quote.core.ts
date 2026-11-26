// @FollowsBlueprint utils-pure-module
const PLAIN_SAFE = /^[A-Za-z0-9/._\-=:@%+~#]$/u;
const NEEDS_ANSI_C = /[^ -~]/u;
const OCTAL = 8;
const OCTAL_WIDTH = 3;
const NAMED_ESCAPES: Readonly<Record<number, string>> = {
  7: '\\a',
  8: '\\b',
  9: '\\t',
  10: '\\n',
  11: '\\v',
  12: '\\f',
  13: '\\r',
  27: '\\E',
  39: "\\'",
  92: '\\\\',
};
const FIRST_PRINTABLE = 32;
const LAST_PRINTABLE = 126;

function quoteByte(byte: number): string {
  const named = NAMED_ESCAPES[byte];
  if (named !== undefined) return named;
  if (byte >= FIRST_PRINTABLE && byte <= LAST_PRINTABLE) return String.fromCharCode(byte);
  return `\\${byte.toString(OCTAL).padStart(OCTAL_WIDTH, '0')}`;
}

function quotePlainCharacter(character: string, index: number): string {
  const isLeadingSign = index === 0 && (character === '~' || character === '#');
  return PLAIN_SAFE.test(character) && !isLeadingSign ? character : `\\${character}`;
}

export function quoteForShell(value: string): string {
  if (value === '') return "''";
  if (NEEDS_ANSI_C.test(value)) {
    const bytes = [...new TextEncoder().encode(value)];
    return `$'${bytes.map(quoteByte).join('')}'`;
  }
  return [...value].map(quotePlainCharacter).join('');
}
