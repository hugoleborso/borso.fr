import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const STRIPPER = resolve(import.meta.dirname, '../.claude/hooks/strip-heredocs.py');
const QUOTE_STRIPPER = resolve(import.meta.dirname, '../.claude/hooks/strip-quoted-strings.py');

function strip(command: string): string {
  return execFileSync('python3', [STRIPPER], { input: command, encoding: 'utf8' });
}

function stripQuoted(command: string): string {
  return execFileSync('python3', [QUOTE_STRIPPER], { input: command, encoding: 'utf8' });
}

describe('strip-heredocs.py', () => {
  it('drops a body whose operator ends the line', () => {
    expect(strip("cat > notes.md <<'EOF'\ngit reset --hard\nEOF\n")).toBe('cat > notes.md \n');
  });

  it('drops a body whose operator line goes on, and keeps the rest of that line', () => {
    const command =
      "git commit -F - <<'EOF' 2>&1 | tail -1\npnpm run test:e2e -- x\nEOF\necho done\n";

    expect(strip(command)).toBe('git commit -F -  2>&1 | tail -1\necho done\n');
  });

  it('keeps a command that has no heredoc', () => {
    expect(strip('git status --short\n')).toBe('git status --short\n');
  });
});

describe('strip-quoted-strings.py', () => {
  it('drops the body of a quoted argument and keeps its quotes', () => {
    expect(stripQuoted('echo "never write git push | tail" | cat')).toBe('echo "" | cat');
  });

  it('keeps a quoted body that is one address and nothing else', () => {
    const command = `curl -s "https://pragma-pr-298.preview.borso.fr/api/me" -H 'accept: text/html'`;

    expect(stripQuoted(command)).toBe(
      `curl -s "https://pragma-pr-298.preview.borso.fr/api/me" -H ''`,
    );
  });

  it('drops a quoted sentence that mentions an address', () => {
    expect(stripQuoted("git commit -m 'see https://example.com/api/ for more'")).toBe(
      "git commit -m ''",
    );
  });
});
