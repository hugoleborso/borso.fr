import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { formatWrite, isInsideProject } from './format-write.core.ts';

interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
}

interface WorldSetup {
  readonly contents?: readonly (string | null)[];
  readonly realpaths?: string | null;
  readonly executables?: readonly string[];
}

function fakeWorld(calls: RecordedCall[], setup: WorldSetup): HookWorld {
  const contents = [...(setup.contents ?? ['a', 'a'])];
  const executables = new Set(setup.executables ?? ['/repo/node_modules/.bin/oxfmt']);
  const realpaths = setup.realpaths === undefined ? '/repo\n/repo/src\n' : setup.realpaths;
  return {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: () => contents.shift() ?? null,
    run: (command, args) => {
      calls.push({ command, args });
      if (command === 'realpath') {
        return { status: realpaths === null ? 1 : 0, stdout: realpaths ?? '', stderr: '' };
      }
      if (command === 'test') {
        return { status: executables.has(args[1] ?? '') ? 0 : 1, stdout: '', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    },
  };
}

function writeCall(filePath: unknown): HookInput {
  return {
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    tool_input: { file_path: filePath },
  };
}

function formatterCalls(calls: readonly RecordedCall[]): RecordedCall[] {
  return calls.filter(({ command }) => command.includes('node_modules'));
}

// @FollowsBlueprint test-pure-unit
describe('isInsideProject', () => {
  it('compares the physical folder of the file against the physical project root', () => {
    const calls: RecordedCall[] = [];

    expect(isInsideProject('/link/src/a.ts', fakeWorld(calls, {}))).toBe(true);
    expect(calls).toEqual([{ command: 'realpath', args: ['-e', '--', '/repo', '/link/src'] }]);
  });

  it('rejects a file outside the root, a sibling sharing its prefix and an unresolved folder', () => {
    expect(isInsideProject('/x/a.ts', fakeWorld([], { realpaths: '/repo\n/scratch\n' }))).toBe(
      false,
    );
    expect(isInsideProject('/x/a.ts', fakeWorld([], { realpaths: '/repo\n/repo-two\n' }))).toBe(
      false,
    );
    expect(isInsideProject('/x/a.ts', fakeWorld([], { realpaths: null }))).toBe(false);
    expect(isInsideProject('/x/a.ts', fakeWorld([], { realpaths: '' }))).toBe(false);
  });
});

describe('formatWrite', () => {
  it('fires on Edit, Write and MultiEdit only', () => {
    expect(formatWrite.tools?.test('MultiEdit')).toBe(true);
    expect(formatWrite.tools?.test('NotebookEdit')).toBe(false);
  });

  it('formats with oxfmt and tells the agent when the file changed', () => {
    const calls: RecordedCall[] = [];
    const verdict = formatWrite.run(
      writeCall('/repo/src/a.ts'),
      fakeWorld(calls, { contents: ['a', 'b'] }),
    );

    expect(verdict).toEqual({
      kind: 'context',
      text: '[format-write] The formatter rewrote /repo/src/a.ts. Read it again before an exact-text replace.',
    });
    expect(formatterCalls(calls)).toEqual([
      { command: '/repo/node_modules/.bin/oxfmt', args: ['/repo/src/a.ts'] },
    ]);
  });

  it('tells the agent when the formatter left the file unreadable', () => {
    const verdict = formatWrite.run(
      writeCall('/repo/src/a.ts'),
      fakeWorld([], { contents: ['a'] }),
    );

    expect(verdict.kind).toBe('context');
  });

  it('says nothing when the formatter left the file as it was', () => {
    expect(formatWrite.run(writeCall('/repo/src/a.css'), fakeWorld([], {}))).toBe(PASS);
  });

  it('falls back to Prettier where oxfmt is not installed', () => {
    const calls: RecordedCall[] = [];
    formatWrite.run(
      writeCall('/repo/src/a.yml'),
      fakeWorld(calls, { executables: ['/repo/node_modules/.bin/prettier'] }),
    );

    expect(formatterCalls(calls)).toEqual([
      {
        command: '/repo/node_modules/.bin/prettier',
        args: ['--write', '--ignore-unknown', '--cache', '/repo/src/a.yml'],
      },
    ]);
  });

  it('formats nothing in a repository with neither formatter installed', () => {
    const calls: RecordedCall[] = [];

    expect(
      formatWrite.run(writeCall('/repo/src/a.ts'), fakeWorld(calls, { executables: [] })),
    ).toBe(PASS);
    expect(formatterCalls(calls)).toEqual([]);
  });

  it('skips markdown, which the formatters rewrite, and any file outside the list', () => {
    const calls: RecordedCall[] = [];
    const world = fakeWorld(calls, {});

    expect(formatWrite.run(writeCall('/repo/README.md'), world)).toBe(PASS);
    expect(formatWrite.run(writeCall('/repo/a.ts.bak'), world)).toBe(PASS);
    expect(formatWrite.run(writeCall(4), world)).toBe(PASS);
    expect(formatWrite.run({ hook_event_name: 'PostToolUse' }, world)).toBe(PASS);
    expect(calls).toEqual([]);
  });

  it('skips a file that does not exist', () => {
    const calls: RecordedCall[] = [];

    expect(formatWrite.run(writeCall('/repo/a.ts'), fakeWorld(calls, { contents: [null] }))).toBe(
      PASS,
    );
    expect(calls).toEqual([]);
  });

  it('skips a scratchpad file outside the repository, which its formatter would bloat', () => {
    const calls: RecordedCall[] = [];
    const world = fakeWorld(calls, { realpaths: '/repo\n/tmp/scratch\n' });

    expect(formatWrite.run(writeCall('/tmp/scratch/mock.html'), world)).toBe(PASS);
    expect(formatterCalls(calls)).toEqual([]);
  });
});
