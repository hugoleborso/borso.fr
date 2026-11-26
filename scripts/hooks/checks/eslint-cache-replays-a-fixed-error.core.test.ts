import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import {
  countTypeAwareErrors,
  describeCacheReplay,
  eslintCacheReplaysAFixedError,
  isUncachedLintCommand,
  readToolOutput,
  selectCaches,
} from './eslint-cache-replays-a-fixed-error.core.ts';

interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
}

interface WorldSetup {
  readonly rootStatus?: number;
  readonly rootOutput?: string;
  readonly found?: string;
}

function fakeWorld(
  calls: RecordedCall[],
  { rootStatus = 0, rootOutput = '/repo\n', found = '' }: WorldSetup,
): HookWorld {
  return {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: () => null,
    run: (command, args) => {
      calls.push({ command, args });
      if (command === 'git') return { status: rootStatus, stdout: rootOutput, stderr: '' };
      return { status: 1, stdout: found, stderr: 'find: missing start point' };
    },
  };
}

const TYPE_AWARE_LINE =
  '  12:5  error  Unsafe call of an `any` value  @typescript-eslint/no-unsafe-call';

function lintRun(fields: Partial<HookInput>, command = 'pnpm run lint'): HookInput {
  return {
    hook_event_name: 'PostToolUseFailure',
    tool_name: 'Bash',
    tool_input: { command },
    ...fields,
  };
}

// @FollowsBlueprint test-pure-unit
describe('isUncachedLintCommand', () => {
  it('matches a command that runs ESLint or a lint script', () => {
    expect(isUncachedLintCommand('pnpm exec eslint .')).toBe(true);
    expect(isUncachedLintCommand('pnpm --filter x lint')).toBe(true);
  });

  it('skips a command that names no lint and one that already clears a cache', () => {
    expect(isUncachedLintCommand('pnpm test')).toBe(false);
    expect(isUncachedLintCommand('rm -rf .eslintcache && pnpm run lint')).toBe(false);
    expect(isUncachedLintCommand('rm -rf node_modules/.cache/eslint; pnpm lint')).toBe(false);
  });
});

describe('readToolOutput', () => {
  it('prefers the error of a failed call', () => {
    expect(readToolOutput(lintRun({ error: 'boom', tool_response: 'ignored' }))).toBe('boom');
  });

  it('reads a text response as it is', () => {
    expect(readToolOutput(lintRun({ tool_response: 'out' }))).toBe('out');
  });

  it('joins stdout, stderr and output of an object response, reading a missing one as empty', () => {
    expect(
      readToolOutput(lintRun({ tool_response: { output: 'c', stderr: 'b', stdout: 'a' } })),
    ).toBe('a\nb\nc');
    expect(
      readToolOutput(lintRun({ tool_response: { stdout: 'a', output: 'c', stderr: 4 } })),
    ).toBe('a\n\nc');
  });

  it('reads nothing from a missing or non-object response', () => {
    expect(readToolOutput(lintRun({}))).toBe('');
    expect(readToolOutput(lintRun({ tool_response: ['a'] }))).toBe('');
    expect(readToolOutput(lintRun({ tool_response: null }))).toBe('');
  });
});

describe('countTypeAwareErrors', () => {
  it('counts each ESLint report line of a type-aware rule', () => {
    expect(
      countTypeAwareErrors(
        `${TYPE_AWARE_LINE}\n3:1 error x @typescript-eslint/no-unnecessary-condition  \nnoise`,
      ),
    ).toBe(2);
  });

  it('ignores a mention of a rule outside a report line, a warning and a syntactic rule', () => {
    expect(
      countTypeAwareErrors(
        [
          'docs: @typescript-eslint/no-unsafe-call is type-aware',
          '  1:1  warning  x  @typescript-eslint/no-unsafe-call',
          '  1:1  error  x  @typescript-eslint/no-explicit-any',
          '  1:1  error  x  @typescript-eslint/no-unsafe-call-extra',
        ].join('\n'),
      ),
    ).toBe(0);
  });
});

describe('selectCaches', () => {
  it('keeps the root and nested ESLint caches, relative to the root and sorted', () => {
    expect(
      selectCaches(
        '/repo',
        '/repo/node_modules/.cache/eslint\n/repo/.eslintcache-b\n/repo/.eslintcache\n/repo/eslint.config.js\n/repo/node_modules/.cache/.eslintcache\n',
      ),
    ).toEqual(['.eslintcache', '.eslintcache-b', 'node_modules/.cache/eslint']);
  });

  it('keeps a nested cache whose name only starts with eslint', () => {
    expect(selectCaches('/repo', '/repo/node_modules/.cache/eslint-loader\n')).toEqual([
      'node_modules/.cache/eslint-loader',
    ]);
  });

  it('drops a path outside the root, even one whose tail reads as a cache', () => {
    expect(selectCaches('/repo', '/rep0/.eslintcache\n')).toEqual([]);
  });
});

describe('describeCacheReplay', () => {
  it('names the count and each cache with the trailing space the old listing carried', () => {
    expect(describeCacheReplay(2, '/repo', ['.eslintcache', 'node_modules/.cache/eslint'])).toBe(
      `[eslint-cache] that run reported 2 type-aware error(s), and an ESLint cache exists: .eslintcache node_modules/.cache/eslint\x20

Type-aware rules read the whole type graph; --cache-strategy content keys on
each file's own bytes. So when the types a file DEPENDS ON change — another
workspace, a bumped dependency, a fixed signature elsewhere — the file itself
is unchanged, the cache hits, and the error that is already fixed is replayed.
Re-running reproduces it exactly, which is what makes it read as a real error.

Before treating these as real, settle it in one command:

  (cd "/repo" && rm -rf .eslintcache node_modules/.cache/eslint ) && pnpm run lint

If they survive that, they are real. See
https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md.`,
    );
  });
});

describe('eslintCacheReplaysAFixedError', () => {
  it('fires on the Bash tool only', () => {
    expect(eslintCacheReplaysAFixedError.tools?.test('Bash')).toBe(true);
    expect(eslintCacheReplaysAFixedError.tools?.test('BashOutput')).toBe(false);
  });

  it('warns when a type-aware error meets a cache, finding the root from the session folder', () => {
    const calls: RecordedCall[] = [];
    const world = fakeWorld(calls, { found: '/repo/.eslintcache\n' });
    const verdict = eslintCacheReplaysAFixedError.run(
      lintRun({ error: TYPE_AWARE_LINE, cwd: '/repo/apps/x' }),
      world,
    );

    expect(verdict).toEqual({
      kind: 'context',
      text: describeCacheReplay(1, '/repo', ['.eslintcache']),
    });
    expect(calls[0]).toEqual({
      command: 'git',
      args: ['-C', '/repo/apps/x', 'rev-parse', '--show-toplevel'],
    });
    expect(calls[1]).toEqual({
      command: 'find',
      args: [
        '/repo',
        '/repo/node_modules/.cache',
        '-mindepth',
        '1',
        '-maxdepth',
        '1',
        '(',
        '-name',
        '.eslintcache*',
        '-o',
        '-name',
        'eslint*',
        ')',
      ],
    });
  });

  it('strips only the trailing newlines git prints after the root', () => {
    const calls: RecordedCall[] = [];
    eslintCacheReplaysAFixedError.run(
      lintRun({ error: TYPE_AWARE_LINE }),
      fakeWorld(calls, { rootOutput: '/my\nrepo\n\n' }),
    );

    expect(calls[1]?.args.slice(0, 2)).toEqual(['/my\nrepo', '/my\nrepo/node_modules/.cache']);
  });

  it('asks git from its own folder when the input names no session folder', () => {
    const calls: RecordedCall[] = [];
    eslintCacheReplaysAFixedError.run(
      lintRun({ tool_response: { stdout: TYPE_AWARE_LINE } }),
      fakeWorld(calls, { found: '/repo/.eslintcache\n' }),
    );

    expect(calls[0]?.args).toEqual(['rev-parse', '--show-toplevel']);
  });

  it('runs nothing for a command that is not a lint or reports no type-aware error', () => {
    const calls: RecordedCall[] = [];
    const world = fakeWorld(calls, {});

    expect(
      eslintCacheReplaysAFixedError.run(lintRun({ error: TYPE_AWARE_LINE }, 'ls'), world),
    ).toBe(PASS);
    expect(eslintCacheReplaysAFixedError.run(lintRun({ tool_response: 'clean' }), world)).toBe(
      PASS,
    );
    expect(eslintCacheReplaysAFixedError.run({ hook_event_name: 'PostToolUse' }, world)).toBe(PASS);
    expect(
      eslintCacheReplaysAFixedError.run(
        { ...lintRun({ error: TYPE_AWARE_LINE }), tool_input: { command: 7 } },
        world,
      ),
    ).toBe(PASS);
    expect(calls).toEqual([]);
  });

  it('stays silent outside a git repository, looking for no cache, and when no cache exists', () => {
    const input = lintRun({ error: TYPE_AWARE_LINE });
    const calls: RecordedCall[] = [];
    const outside = fakeWorld(calls, { rootStatus: 128, found: '/repo/.eslintcache\n' });

    expect(eslintCacheReplaysAFixedError.run(input, outside)).toBe(PASS);
    expect(calls.map((call) => call.command)).toEqual(['git']);
    expect(eslintCacheReplaysAFixedError.run(input, fakeWorld([], { found: '' }))).toBe(PASS);
  });
});
