import { parseSync } from 'oxc-parser';

const SCRIPT_FILE = /\.[cm]?[jt]sx?$/u;
const POSITION_KEYS: ReadonlySet<string> = new Set(['start', 'end', 'range', 'loc']);

function withoutPositions(key: string, value: unknown): unknown {
  return POSITION_KEYS.has(key) ? undefined : value;
}

function readCode(path: string, source: string): string | null {
  const parsed = parseSync(path, source, { preserveParens: false });
  return parsed.errors.length === 0 ? JSON.stringify(parsed.program, withoutPositions) : null;
}

export function isCommentOnlyEdit(
  path: string,
  before: string | null | undefined,
  after: string | null | undefined,
): boolean {
  if (!SCRIPT_FILE.test(path) || typeof before !== 'string' || typeof after !== 'string') {
    return false;
  }
  const codeBefore = readCode(path, before);
  return codeBefore !== null && codeBefore === readCode(path, after);
}
