import { describe, expect, it } from 'vitest';
import { listSimpleCommands, stripHeredocBodies, stripStringBodies } from './shell-command.core.ts';

// @FollowsBlueprint test-pure-unit
describe('listSimpleCommands', () => {
  it('lists every command of a chain, a pipeline and a substitution', () => {
    expect(listSimpleCommands('cd a && git push origin x | tail -3; echo $(pkill node)')).toEqual([
      { name: 'cd', args: ['a'] },
      { name: 'git', args: ['push', 'origin', 'x'] },
      { name: 'tail', args: ['-3'] },
      { name: 'echo', args: ['$(pkill node)'] },
      { name: 'pkill', args: ['node'] },
    ]);
  });

  it('reads a quoted mention as an argument, never as a command', () => {
    expect(listSimpleCommands('echo "git reset --hard"')).toEqual([
      { name: 'echo', args: ['git reset --hard'] },
    ]);
  });

  it('reads no command inside a heredoc body', () => {
    expect(listSimpleCommands("cat > notes.md <<'EOF'\ngit reset --hard\nEOF\n")).toEqual([
      { name: 'cat', args: [] },
    ]);
  });

  it('keeps an assignment argument as written', () => {
    expect(listSimpleCommands('env FOO=bar node x.ts')).toEqual([
      { name: 'env', args: ['FOO=bar', 'node', 'x.ts'] },
    ]);
  });

  it('keeps an assignment an export declares, as written', () => {
    expect(listSimpleCommands('export FOO="a b"')).toEqual([
      { name: 'export', args: ['FOO="a b"'] },
    ]);
  });

  it('skips a bare assignment, which runs no command', () => {
    expect(listSimpleCommands('FOO=bar')).toEqual([]);
  });
});

describe('stripStringBodies, so a regex over a command line misses what is only quoted', () => {
  it('drops a body whose operator ends the line', () => {
    expect(stripStringBodies("cat > notes.md <<'EOF'\ngit reset --hard\nEOF\n")).toBe(
      'cat > notes.md \n',
    );
  });

  it('drops a body whose operator line goes on, and keeps the rest of that line', () => {
    const command =
      "git commit -F - <<'EOF' 2>&1 | tail -1\npnpm run test:e2e -- x\nEOF\necho done\n";

    expect(stripStringBodies(command)).toBe('git commit -F -  2>&1 | tail -1\necho done\n');
  });

  it('keeps the operator line break when the closing line ends the input', () => {
    expect(stripStringBodies('cat <<EOF\ngit push\nEOF')).toBe('cat \n');
  });

  it('drops the rest of the input after a heredoc that never closes', () => {
    expect(stripStringBodies('cat <<EOF\ngit push')).toBe('cat \n');
  });

  it('keeps a command that has no heredoc', () => {
    expect(stripStringBodies('git status --short\n')).toBe('git status --short\n');
  });

  it('drops the body of a quoted argument and keeps its quotes', () => {
    expect(stripStringBodies('echo "never write git push | tail" | cat')).toBe('echo "" | cat');
  });

  it('keeps a quoted body that is one address and nothing else', () => {
    const command = `curl -s "https://pragma-pr-298.preview.borso.fr/api/me" -H 'accept: text/html'`;

    expect(stripStringBodies(command)).toBe(
      `curl -s "https://pragma-pr-298.preview.borso.fr/api/me" -H ''`,
    );
  });

  it('drops a quoted sentence that mentions an address', () => {
    expect(stripStringBodies("git commit -m 'see https://example.com/api/ for more'")).toBe(
      "git commit -m ''",
    );
  });

  it('keeps a quote that never closes as written', () => {
    expect(stripStringBodies('foo "unterminated')).toBe('foo "unterminated');
    expect(stripStringBodies('echo "a" "b')).toBe('echo "" "b');
  });

  it('drops a quoted body once, even when it nests a substitution with quotes', () => {
    expect(stripStringBodies('echo "a $(echo \'b\') c"')).toBe('echo ""');
  });
});

describe('stripHeredocBodies, for a hook that reads quoted flag values', () => {
  it('drops a heredoc body and keeps every quoted argument', () => {
    expect(stripHeredocBodies("gh pr create --body \"x\" <<'EOF'\nbody\nEOF\necho 'y'\n")).toBe(
      'gh pr create --body "x" \necho \'y\'\n',
    );
  });
});
