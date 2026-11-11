import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const STRIPPER = resolve(import.meta.dirname, '../.claude/hooks/strip-heredocs.py');

function strip(command: string): string {
  return execFileSync('python3', [STRIPPER], { input: command, encoding: 'utf8' });
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
